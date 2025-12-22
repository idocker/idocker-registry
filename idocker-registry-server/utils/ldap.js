import ldap from 'ldapjs';
import User from '../models/User.js';

class LDAPService {
  constructor(config) {
    this.config = config;
    this.client = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.client = ldap.createClient({
        url: this.config.url,
        tlsOptions: this.config.tlsOptions || {}
      });

      this.client.on('error', (err) => {
        console.error('LDAP client error:', err);
        reject(err);
      });

      this.client.bind(this.config.bindDN, this.config.bindCredentials, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async authenticate(username, password) {
    if (!this.client) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const userDN = this.config.userDNTemplate.replace('{username}', username);
      
      this.client.bind(userDN, password, async (err) => {
        if (err) {
          reject(new Error('Authentication failed'));
          return;
        }

        try {
          const user = await this.searchUser(username);
          resolve(user);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async searchUser(username) {
    return new Promise((resolve, reject) => {
      const searchFilter = this.config.searchFilter.replace('{username}', username);
      
      this.client.search(
        this.config.searchBase,
        { filter: searchFilter, scope: 'sub', attributes: this.config.searchAttributes || ['dn', 'cn', 'mail', 'memberOf'] },
        (err, res) => {
          if (err) {
            reject(err);
            return;
          }

          let found = false;
          res.on('searchEntry', (entry) => {
            found = true;
            const userData = entry.object;
            resolve(userData);
          });

          res.on('searchReference', (referral) => {
            console.log('referral: ' + referral.uris.join());
          });

          res.on('error', (err) => {
            reject(err);
          });

          res.on('end', (result) => {
            if (!found) {
              reject(new Error('User not found in LDAP'));
            }
          });
        }
      );
    });
  }

  async syncUser(ldapUserData, password) {
    try {
      const { cn, mail } = ldapUserData;
      const username = cn;
      const email = mail || `${username}@ldap.local`;
      
      let user = await User.findByUsername(username);
      
      if (!user) {
        user = await User.create({
          username,
          email,
          password: password || Math.random().toString(36).slice(-8),
          role: 'user',
          ldapUser: true
        });
      } else {
        user.ldap_user = true;
      }
      
      return user;
    } catch (error) {
      throw new Error(`Error syncing LDAP user: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.client) {
      this.client.unbind();
      this.client = null;
    }
  }
}

let ldapInstance = null;

export const getLDAPService = (config) => {
  if (!ldapInstance && config && config.enabled) {
    ldapInstance = new LDAPService(config);
  }
  return ldapInstance;
};

export default LDAPService;