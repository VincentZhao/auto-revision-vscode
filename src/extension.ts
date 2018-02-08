'use strict';
import * as vscode from 'vscode';
import { window, commands, TextEdit, Position, TextEditor } from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let disposable = commands.registerCommand('extension.autoRevision', () => {
        let editor = window.activeTextEditor;
        let lang = editor.document.languageId;
        let revision: Revision
        if (lang === "ruby") {
            revision = new RubyRevision(editor);
        } else if (lang === "javascript") {
            revision = new JsRevision(editor);
        } else {
            window.showInformationMessage("AutoRevision 暂时不支持当前的文件类型。")
            return
        }

        editor.edit((editor) => {
            editor.insert(revision.insertPoint(), revision.revisionMessage())
        })
    });
    context.subscriptions.push(disposable);
}

class Revision {
    editor: TextEditor;

    constructor(theEditor: TextEditor) {
        this.editor = theEditor;
    }

    revisionMessage(): string {
        if (this.latestRevisionRow()) {
            return this.newRevision();
        } else {
            return this.defaultRevision()
        }
    }

    latestRevisionRow() {
        let fullText = this.editor.document.getText();
        let revisionRegExp = /REV\.\d{2}.*\d{4}\/\d{2}\/\d{2}(?![.\s\S]*REV\.\d{2}.*\d{4}\/\d{2}\/\d{2})/g;
        let match = revisionRegExp.exec(fullText);

        if (match) {
            return this.editor.document.positionAt(match.index).line;
        } else {
            return null;
        }
    }

    today() {
        var today = new Date();
        var dd = today.getDate() < 10 ? "0" + today.getDate() : today.getDate();
        var mm = today.getMonth() + 1 < 10 ? "0" + (today.getMonth() + 1) : today.getMonth() + 1;

        return `${this.thisYear()}/${mm}/${dd}`;
    }

    thisYear() {
        var today = new Date();
        return today.getFullYear();
    }

    newRevisionNo() {
        let latestRevisionRowText = this.editor.document.lineAt(this.latestRevisionRow()).text
        let oldRevisionStr = latestRevisionRowText.match(/REV\.(\d{2})/)[1]
        let newRevisionNo = Number(oldRevisionStr) + 1
        return (newRevisionNo < 10 ? "0" + newRevisionNo : newRevisionNo)
    }

    signature() {
        return vscode.workspace.getConfiguration("autoRevision").get("signature")
    }

    message() {
        return vscode.workspace.getConfiguration("autoRevision").get("message")
    }

    newRevision(): string { return "" }
    defaultRevision(): string { return "" }
    insertPoint(): Position {
        return new Position(0, 0)
    }
}

class RubyRevision extends Revision {
    insertPoint() {
        if (this.latestRevisionRow()) {
            let lineNo = this.latestRevisionRow()
            for (let i = 1; i <= 10; i++) {
                let line = this.editor.document.lineAt(lineNo + i).text
                if (/^#\s?$/.test(line)) {
                    return new Position(lineNo + i, 0)
                }
            }
            // FIXME
            return new Position(lineNo + 2, 0)
        } else {
            return new Position(0, 0)
        }
    }

    newRevision() {
        let result = `#   REV.${this.newRevisionNo()} ${this.today()}  BY. ${this.signature()}
#     ${this.message()}
`

        return result
    }

    defaultRevision() {
        let result = `# encoding: UTF-8
#
# (c) ${this.thisYear()} Azbil Corporation All Rights Reserved.
#
# ORIGINAL SOURCE INFORMATION
#
# REVISION HISTORY
#   REV.00 ${this.today()}  BY. ${this.signature()}
#
`

        return result;
    }
}

class JsRevision extends Revision {
    insertPoint() {
        if (this.latestRevisionRow()) {
            let lineNo = this.latestRevisionRow()
            for (let i = 1; i <= 10; i++) {
                let line = this.editor.document.lineAt(lineNo + i).text
                if (/^\s\*\s\={5,}$/.test(line)) {
                    return new Position(lineNo + i, 0)
                }
            }
            // FIXME
            return new Position(lineNo + 2, 0)
        } else {
            return new Position(0, 0)
        }
    }

    newRevision() {
        let result = ` *   REV.${this.newRevisionNo()} ${this.today()} BY. ${this.signature()}
 *       ${this.message()}
`

        return result
    }

    defaultRevision() {
        let result = `/*jslint sloppy: true , browser: true */
/*global AZBIL, Highcharts, jQuery, $ */
/* =================================================================
 * NO.83XXXXXX
 *
 * (c) ${this.thisYear()} Azbil Corporation All Rights Reserved.
 *
 * REVISION HISTORY
 *   REV.00 ${this.today()} BY. ${this.signature()}
 * =================================================================
 */
`
        return result;
    }
}

export function deactivate() {
}