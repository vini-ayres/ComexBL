import ldap from 'ldapjs';
import { env } from '../config/env.js';
import {
  extractGroupCnFromMemberOf,
  LDAP_AD_GROUPS,
} from '../config/ldap-groups.js';
import {
  BadRequestError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../errors/AppError.js';

export interface LdapUserEntry {
  dn: string;
  login: string;
  email: string;
  displayName: string;
  adObjectId: string | null;
  memberOf: string[];
  adGroupNames: string[];
}

export interface LdapGroupEntry {
  name: string;
  dn: string;
}

function createClient(): ldap.Client {
  return ldap.createClient({
    url: env.ldap.url,
    reconnect: false,
    timeout: 15_000,
    connectTimeout: 10_000,
    tlsOptions: env.ldap.useTls ? { rejectUnauthorized: false } : undefined,
  });
}

function bindClient(client: ldap.Client, dn: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function unbindClient(client: ldap.Client): Promise<void> {
  return new Promise((resolve) => {
    client.unbind(() => resolve());
  });
}

function searchEntries(
  client: ldap.Client,
  base: string,
  options: ldap.SearchOptions,
): Promise<ldap.SearchEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: ldap.SearchEntry[] = [];

    client.search(base, options, (err, response) => {
      if (err) {
        reject(err);
        return;
      }

      response.on('searchEntry', (entry) => {
        entries.push(entry);
      });

      response.on('error', (searchErr) => {
        reject(searchErr);
      });

      response.on('end', () => {
        resolve(entries);
      });
    });
  });
}

function getAttributeValues(entry: ldap.SearchEntry, name: string): string[] {
  const attribute = entry.attributes.find(
    (item) => item.type.toLowerCase() === name.toLowerCase(),
  );

  if (!attribute) {
    return [];
  }

  const rawValues = attribute.values;
  const values = Array.isArray(rawValues) ? rawValues : [rawValues];

  return values.map((value: string | Buffer) => {
    if (Buffer.isBuffer(value)) {
      return value.toString('utf8');
    }
    return String(value);
  });
}

function getBinaryAttribute(entry: ldap.SearchEntry, name: string): Buffer | null {
  const attribute = entry.attributes.find(
    (item) => item.type.toLowerCase() === name.toLowerCase(),
  );

  if (!attribute?.values[0]) {
    return null;
  }

  const value = attribute.values[0];
  return Buffer.isBuffer(value) ? value : Buffer.from(String(value));
}

function decodeAdObjectGuid(buffer: Buffer): string {
  if (buffer.length !== 16) {
    return buffer.toString('hex');
  }

  const part1 = buffer.subarray(0, 4).reverse().toString('hex');
  const part2 = buffer.subarray(4, 6).reverse().toString('hex');
  const part3 = buffer.subarray(6, 8).reverse().toString('hex');
  const part4 = buffer.subarray(8, 10).toString('hex');
  const part5 = buffer.subarray(10, 16).toString('hex');

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

function mapUserEntry(entry: ldap.SearchEntry): LdapUserEntry {
  const login =
    getAttributeValues(entry, 'sAMAccountName')[0] ??
    getAttributeValues(entry, 'uid')[0] ??
    '';
  const email =
    getAttributeValues(entry, 'mail')[0] ??
    getAttributeValues(entry, 'userPrincipalName')[0] ??
    `${login}@local`;
  const displayName =
    getAttributeValues(entry, 'displayName')[0] ??
    getAttributeValues(entry, 'cn')[0] ??
    login;
  const memberOf = getAttributeValues(entry, 'memberOf');
  const allowedGroups = new Set<string>(LDAP_AD_GROUPS.map((group) => group.name));
  const adGroupNames = memberOf
    .map((dn) => extractGroupCnFromMemberOf(dn))
    .filter((name): name is string => Boolean(name && allowedGroups.has(name)));

  const objectGuid = getBinaryAttribute(entry, 'objectGUID');

  return {
    dn: entry.dn.toString(),
    login: login.toLowerCase(),
    email: email.toLowerCase(),
    displayName,
    adObjectId: objectGuid ? decodeAdObjectGuid(objectGuid) : null,
    memberOf,
    adGroupNames,
  };
}

export function normalizeLogin(raw: string): string {
  const trimmed = raw.trim();

  if (!trimmed) {
    return '';
  }

  if (trimmed.includes('\\')) {
    return trimmed.split('\\').pop()!.trim().toLowerCase();
  }

  if (trimmed.includes('@')) {
    return trimmed.split('@')[0]!.trim().toLowerCase();
  }

  return trimmed.toLowerCase();
}

function getServiceAccountBindIdentity(): string {
  if (env.ldap.bindUpn.trim()) {
    return env.ldap.bindUpn.trim();
  }

  if (env.ldap.bindDn.trim()) {
    return env.ldap.bindDn.trim();
  }

  throw new BadRequestError(
    'Defina LDAP_BIND_DN ou LDAP_BIND_UPN no .env para a conta de serviço.',
  );
}

function isInvalidCredentialsError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('invalid credentials') ||
    message.includes('data 52e') ||
    message.includes('data 775')
  );
}

export class LdapService {
  assertConfigured(): void {
    if (!env.ldap.enabled) {
      throw new BadRequestError(
        'LDAP não configurado. Defina LDAP_URL, LDAP_BASE_DN, LDAP_BIND_DN (ou LDAP_BIND_UPN) e LDAP_BIND_PASSWORD no .env.',
      );
    }
  }

  async withServiceAccount<T>(operation: (client: ldap.Client) => Promise<T>): Promise<T> {
    this.assertConfigured();
    const client = createClient();
    const bindIdentity = getServiceAccountBindIdentity();

    try {
      await bindClient(client, bindIdentity, env.ldap.bindPassword);
      return await operation(client);
    } catch (error) {
      if (isInvalidCredentialsError(error)) {
        throw new ServiceUnavailableError(
          'Falha no bind da conta de serviço LDAP. Verifique LDAP_BIND_DN (ou LDAP_BIND_UPN) e LDAP_BIND_PASSWORD no .env.',
        );
      }

      throw error;
    } finally {
      await unbindClient(client);
    }
  }

  async testConnection(): Promise<void> {
    await this.withServiceAccount(async (client) => {
      await searchEntries(client, env.ldap.baseDn, {
        scope: 'base',
        filter: '(objectClass=*)',
        sizeLimit: 1,
      });
    });
  }

  async findUserByLogin(login: string): Promise<LdapUserEntry | null> {
    const normalizedLogin = normalizeLogin(login);

    if (!normalizedLogin) {
      return null;
    }

    return this.withServiceAccount(async (client) => {
      const entries = await searchEntries(client, env.ldap.baseDn, {
        scope: 'sub',
        filter: `(&(objectClass=user)(objectCategory=person)(|(sAMAccountName=${escapeFilter(normalizedLogin)})(userPrincipalName=${escapeFilter(normalizedLogin)})))`,
        attributes: [
          'dn',
          'sAMAccountName',
          'mail',
          'userPrincipalName',
          'displayName',
          'cn',
          'memberOf',
          'objectGUID',
        ],
        sizeLimit: 1,
      });

      const entry = entries[0];
      return entry ? mapUserEntry(entry) : null;
    });
  }

  async authenticateUser(login: string, password: string): Promise<LdapUserEntry> {
    this.assertConfigured();

    if (!password) {
      throw new UnauthorizedError('Informe usuário e senha de rede.');
    }

    const ldapUser = await this.findUserByLogin(login);

    if (!ldapUser) {
      throw new UnauthorizedError(
        'Usuário não encontrado no Active Directory. Verifique o login informado.',
      );
    }

    const client = createClient();

    try {
      await bindClient(client, ldapUser.dn, password);
      const adGroupNames = await this.resolveAuthorizedGroupsForUser(ldapUser.login, ldapUser.dn);

      return {
        ...ldapUser,
        adGroupNames,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError || error instanceof UnauthorizedError) {
        throw error;
      }

      if (isInvalidCredentialsError(error)) {
        throw new UnauthorizedError('Senha incorreta no Active Directory.');
      }

      throw error;
    } finally {
      await unbindClient(client);
    }
  }

  async resolveAuthorizedGroupsForUser(login: string, _userDn: string): Promise<string[]> {
    return this.withServiceAccount(async (client) => {
      const normalizedLogin = normalizeLogin(login);
      const authorizedGroups: string[] = [];

      for (const configuredGroup of LDAP_AD_GROUPS) {
        const group = await this.findGroupByNameWithClient(client, configuredGroup.name);
        if (!group) {
          continue;
        }

        const entries = await searchEntries(client, env.ldap.baseDn, {
          scope: 'sub',
          filter: `(&(objectClass=user)(objectCategory=person)(memberOf=${escapeFilter(group.dn)})(sAMAccountName=${escapeFilter(normalizedLogin)}))`,
          attributes: ['sAMAccountName'],
          sizeLimit: 1,
        });

        if (entries.length > 0) {
          authorizedGroups.push(configuredGroup.name);
        }
      }

      return authorizedGroups;
    });
  }

  async findGroupByName(groupName: string): Promise<LdapGroupEntry | null> {
    return this.withServiceAccount(async (client) =>
      this.findGroupByNameWithClient(client, groupName),
    );
  }

  private async findGroupByNameWithClient(
    client: ldap.Client,
    groupName: string,
  ): Promise<LdapGroupEntry | null> {
    const entries = await searchEntries(client, env.ldap.baseDn, {
      scope: 'sub',
      filter: `(&(objectClass=group)(cn=${escapeFilter(groupName)}))`,
      attributes: ['cn'],
      sizeLimit: 1,
    });

    const entry = entries[0];
    if (!entry) {
      return null;
    }

    return {
      name: getAttributeValues(entry, 'cn')[0] ?? groupName,
      dn: entry.dn.toString(),
    };
  }

  async listGroupMembers(groupDn: string): Promise<LdapUserEntry[]> {
    return this.withServiceAccount(async (client) => {
      const entries = await searchEntries(client, env.ldap.baseDn, {
        scope: 'sub',
        filter: `(&(objectClass=user)(objectCategory=person)(memberOf=${escapeFilter(groupDn)}))`,
        attributes: [
          'sAMAccountName',
          'mail',
          'userPrincipalName',
          'displayName',
          'cn',
          'memberOf',
          'objectGUID',
        ],
      });

      return entries.map(mapUserEntry).filter((user) => user.login);
    });
  }
}

function escapeFilter(value: string): string {
  return value.replace(/[\\*()\0]/g, (char) => {
    switch (char) {
      case '*':
        return '\\2a';
      case '(':
        return '\\28';
      case ')':
        return '\\29';
      case '\\':
        return '\\5c';
      case '\0':
        return '\\00';
      default:
        return char;
    }
  });
}

export const ldapService = new LdapService();
