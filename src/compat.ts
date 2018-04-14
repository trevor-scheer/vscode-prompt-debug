import * as path from 'path';
import * as semver from 'semver';
import { Uri, workspace, WorkspaceFolder, version, WorkspaceConfiguration } from 'vscode';
import { LooseUri, isDescendent, toUri } from './fsTools';
import { PREFIX, CONFIG_ID_FRAGMENTS } from './constants';

export const isCaseInsensitive = process.platform === 'win32';
export const isMultiRootSupported: boolean = semver.gte(semver.coerce(version)!, semver.coerce('v1.18')!);

export const isWorkspaceOpen = (): boolean => (
    !!(isMultiRootSupported && workspace.workspaceFolders && workspace.workspaceFolders.length > 0)
        ||
    !!(workspace.rootPath && workspace.rootPath.length > 0)
);

export type PotentiallyFauxWorkspaceFolder = WorkspaceFolder & { faux?: true };

export function getWorkspaces(): PotentiallyFauxWorkspaceFolder[] | null {
    if (isWorkspaceOpen()) {
        if (isMultiRootSupported) {
            return workspace.workspaceFolders as PotentiallyFauxWorkspaceFolder[];
        } else {
            return [{
                index: 0,
                faux: true,
                name: path.basename(workspace.rootPath!),
                uri: Uri.file(workspace.rootPath!)
            }];
        }
    } else {
        return null;
    }
}

export function getWorkspaceFolderByName(workspaceName?: string): PotentiallyFauxWorkspaceFolder | null {
    const ws = getWorkspaces();
    if (ws) {
        if (workspaceName) {
            return ws.find(w => w.name === workspaceName) || null;
        } else {
            return (ws.length === 1 && ws[0].faux) ? ws[0] : null;
        }
    } else {
        return null
    }
}


export async function getWorkspaceFolder(resource?: LooseUri): Promise<PotentiallyFauxWorkspaceFolder | null> {
    if (isWorkspaceOpen()) {
       if (resource) {
            if (isMultiRootSupported) {
                const res = await toUri(resource);
                const ws = workspace.getWorkspaceFolder(res);
                return (ws) ? ws : null;
            } else {
                return ((isDescendent(resource, workspace.rootPath!))
                    .then(isChild => ((isChild)
                        ? ({
                            index: 0,
                            faux: true as true,
                            name: path.basename(workspace.rootPath!),
                            uri: Uri.file(workspace.rootPath!)
                        }) : (
                            null
                        )
                    ))
                );
            }
        } else {
            if (isMultiRootSupported) {
                return workspace.workspaceFolders![0];
            } else {
                return {
                    index: 0,
                    faux: true,
                    name: path.basename(workspace.rootPath!),
                    uri: Uri.file(workspace.rootPath!)
                };
            }
        }
    } else {
        return null;
    }
}

export async function getWorkspaceFolderUri(resource?: LooseUri): Promise<Uri | null> {
    return getWorkspaceFolder(resource).then(ws => (ws && ws.uri) || null);
}

export async function getWorkspaceFolderPath(resource?: LooseUri): Promise<string | null> {
    return getWorkspaceFolder(resource).then(ws => (ws && ws.uri.fsPath) || null);
}

export function config(resource?: Uri): WorkspaceConfiguration {
    if (resource && isMultiRootSupported) {
        return workspace.getConfiguration(PREFIX, resource);
    } else {
        return workspace.getConfiguration(PREFIX);
    }
}