// Administrative CLI: uses the signed-in Firebase CLI account's IAM authority.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth.js');
const [operation, email] = process.argv.slice(2);
if (!['grant','revoke'].includes(operation) || !email?.includes('@')) throw new Error('Usage: node scripts/developer-access.mjs grant|revoke EMAIL');
const account = auth.getGlobalDefaultAccount();
if (!account) throw new Error('Sign in with firebase login first.');
const token = await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/firebase']);
async function request(action,body) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/clusterii-20261020/accounts:${action}`,{method:'POST',headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data = await response.json();
  if(!response.ok)throw new Error(`Account operation failed (${response.status}): ${data.error?.message ?? 'unknown error'}`);
  return data;
}
const found = await request('lookup',{email:[email]});
const user = found.users?.find(user=>user.email===email);
if(!user)throw new Error('The player must sign in to Cluster before access can be assigned.');
const claims = JSON.parse(user.customAttributes || '{}');
if(operation==='grant')claims.developer=true;else delete claims.developer;
await request('update',{localId:user.localId,customAttributes:JSON.stringify(claims)});
console.log(`Development access ${operation==='grant'?'granted':'revoked'} for ${email}. Reopen campaigns to refresh the token.`);
