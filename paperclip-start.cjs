const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { spawn, spawnSync } = require('node:child_process');

async function main() {
  const root = __dirname;
  const server = path.join(root, 'Paperclip', 'server');
  const requireServer = createRequire(path.join(server, 'package.json'));
  const envFile = path.join(root, 'Paperclip', '.env');
  const localEnv = fs.existsSync(envFile) ? requireServer('dotenv').parse(fs.readFileSync(envFile)) : {};
  const env = { ...localEnv, ...process.env, PAPERCLIP_UI_DEV_MIDDLEWARE: 'false', PAPERCLIP_SERVE_UI: 'true' };
  const defaultUrl = 'postgres://paperclip:paperclip@127.0.0.1:54329/self_agent_dev';
  env.DATABASE_URL ||= defaultUrl;
  if (!fs.existsSync(path.join(root, 'Paperclip', 'ui', 'dist', 'index.html'))) {
    throw new Error('Run pnpm paperclip:prepare before starting Paperclip.');
  }
  if (process.platform === 'win32' && env.DATABASE_URL === defaultUrl) {
    env.Path = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32') + ';' + (env.Path || env.PATH || '');
    const requireDb = createRequire(path.join(root, 'Paperclip', 'packages', 'db', 'package.json'));
    const native = await import(pathToFileURL(requireDb.resolve('@embedded-postgres/windows-x64')).href);
    const nativeRoot = path.dirname(path.dirname(native.initdb));
    const key = require('node:crypto').createHash('sha256').update(nativeRoot).digest('hex').slice(0, 12);
    const alias = path.join(os.homedir(), '.paperclip', 'native', 'self-agent-' + key);
    fs.mkdirSync(path.dirname(alias), { recursive: true });
    if (!fs.existsSync(alias)) fs.symlinkSync(nativeRoot, alias, 'junction');
    const instance = path.join(os.homedir(), '.paperclip', 'instances', 'default');
    const data = path.join(instance, 'db');
    fs.mkdirSync(instance, { recursive: true });
    const run = (exe, args, quiet = false) => {
      const result = spawnSync(path.join(alias, 'bin', exe), args, { env, stdio: quiet ? 'ignore' : 'inherit' });
      if (result.error) throw result.error;
      return result.status;
    };
    if (!fs.existsSync(path.join(data, 'PG_VERSION'))) {
      if (fs.existsSync(data) && fs.readdirSync(data).length) throw new Error('Existing database directory needs inspection; refusing to overwrite it.');
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'self-agent-pg-'));
      const password = path.join(temp, 'password');
      try {
        fs.writeFileSync(password, 'paperclip\n');
        if (run('initdb.exe', ['--pgdata=' + data, '--username=paperclip', '--auth=password', '--pwfile=' + password, '--encoding=UTF8', '--locale=C', '--lc-messages=C']) !== 0) throw new Error('PostgreSQL initialization failed.');
      } finally { fs.unlinkSync(password); fs.rmdirSync(temp); }
    }
    if (run('pg_ctl.exe', ['status', '-D', data], true) !== 0 && run('pg_ctl.exe', ['start', '-D', data, '-l', path.join(instance, 'postgres.log'), '-o', '-p 54329 -h 127.0.0.1', '-w']) !== 0) {
      throw new Error('PostgreSQL startup failed; inspect the instance postgres.log.');
    }
    const sql = requireDb('postgres')('postgres://paperclip:paperclip@127.0.0.1:54329/postgres', { connect_timeout: 5, max: 1 });
    try {
      if (!(await sql`select datname from pg_database where datname = 'self_agent_dev'`).length) await sql`create database self_agent_dev`;
    } finally { await sql.end({ timeout: 1 }); }
  }
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], { cwd: server, env, stdio: 'inherit' });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
