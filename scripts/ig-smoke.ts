type SmokeArgs = {
  forceProxy: boolean;
  username: string;
};

type SmokeSuccess = {
  ok: true;
  username: string;
  source: string;
  photosCount: number;
};

type SmokeFailure = {
  ok: false;
  error: string;
};

const DEFAULT_PROXY_BASE_URL = 'https://gallery-instagram-proxy.onrender.com';

let tsResolutionHookInstalled = false;

function parseArgs(argv: string[]): SmokeArgs {
  let username = '';
  let forceProxy = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--force-proxy') {
      forceProxy = true;
      continue;
    }

    if (argument === '--username') {
      username = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (argument.startsWith('--username=')) {
      username = argument.slice('--username='.length);
    }
  }

  return { forceProxy, username };
}

function normalizeError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'UNKNOWN_ERROR';
}

function printJsonLine(payload: SmokeSuccess | SmokeFailure) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function getConfiguredProxyBaseUrl() {
  const configuredProxyUrl = process.env.EXPO_PUBLIC_INSTAGRAM_PROXY_URL?.trim();

  return configuredProxyUrl || DEFAULT_PROXY_BASE_URL;
}

async function installTsResolutionHook() {
  if (tsResolutionHookInstalled) {
    return;
  }

  const moduleApi = (await import('node:module')) as {
    registerHooks?: (hooks: {
      resolve: (
        specifier: string,
        context: { parentURL?: string },
        nextResolve: (nextSpecifier: string, nextContext: { parentURL?: string }) => unknown
      ) => unknown;
    }) => void;
  };

  moduleApi.registerHooks?.({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        const shouldAppendTsExtension =
          specifier.startsWith('.') &&
          !specifier.endsWith('.ts') &&
          !specifier.endsWith('.js') &&
          !specifier.endsWith('.json') &&
          context.parentURL?.endsWith('.ts');

        if (shouldAppendTsExtension) {
          return nextResolve(`${specifier}.ts`, context);
        }

        throw error;
      }
    },
  });

  tsResolutionHookInstalled = true;
}

async function runDirectSmoke(username: string): Promise<SmokeSuccess> {
  await installTsResolutionHook();

  const directModulePath = '../features/home/api/instagram-direct.ts';
  const { fetchInstagramProfileDirect } = (await import(directModulePath)) as typeof import('../features/home/api/instagram-direct');
  const profile = await fetchInstagramProfileDirect(username);

  return {
    ok: true,
    username: profile.username,
    source: profile.source ?? 'instagram-direct',
    photosCount: profile.photos.length,
  };
}

async function runProxySmoke(username: string): Promise<SmokeSuccess> {
  await installTsResolutionHook();

  const proxyModulePath = '../features/home/api/instagram-proxy.ts';
  const { fetchInstagramProfileFromProxy } = (await import(proxyModulePath)) as typeof import('../features/home/api/instagram-proxy');
  const profile = await fetchInstagramProfileFromProxy(getConfiguredProxyBaseUrl(), username);

  return {
    ok: true,
    username: profile.username,
    source: profile.source ?? 'instagram-proxy',
    photosCount: profile.photos.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const trimmedUsername = args.username.trim();

  if (!trimmedUsername) {
    printJsonLine({ ok: false, error: 'EMPTY_USERNAME' });
    process.exitCode = 1;
    return;
  }

  try {
    const result = args.forceProxy ? await runProxySmoke(trimmedUsername) : await runDirectSmoke(trimmedUsername);

    printJsonLine(result);
    process.exitCode = 0;
  } catch (error) {
    printJsonLine({ ok: false, error: normalizeError(error) });
    process.exitCode = 1;
  }
}

void main();
