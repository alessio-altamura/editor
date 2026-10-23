// The client for VS Code: it starts `doc-runtime language-server` and lets it serve the
// Markdown and CSS files of the document folder. It adds nothing of its own.
import { workspace, type ExtensionContext } from 'vscode';
import { LanguageClient, TransportKind, type ServerOptions } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext): Promise<void> {
  const path = workspace.getConfiguration('docRuntime').get<string>('path') || 'doc-runtime';
  // A path to cli.js runs with node; anything else is the command itself.
  const server: ServerOptions = path.endsWith('.js')
    ? { command: 'node', args: [path, 'language-server'], transport: TransportKind.stdio }
    : { command: path, args: ['language-server'], transport: TransportKind.stdio };
  client = new LanguageClient('docRuntime', 'doc-runtime', server, {
    documentSelector: [
      { scheme: 'file', pattern: '**/*.md' },
      { scheme: 'file', pattern: '**/*.css' },
    ],
  });
  context.subscriptions.push(client);
  await client.start();
}

export async function deactivate(): Promise<void> {
  await client?.stop();
}
