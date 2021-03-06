"use babel";

import { CompositeDisposable } from "atom";

function currentFile() {
	const editor = atom.workspace.getActiveTextEditor();
	return editor && editor.getPath();
}

let subscriptions, goconfig;
let delve, editors, output, panel, store;
let initialState, dependenciesInstalled, path;

export default {
	activate(state) {
		initialState = state;

		subscriptions = new CompositeDisposable();

		require("atom-package-deps").install("go-debug").then(() => {
			dependenciesInstalled = true;
			this.start();
			return true;
		}).catch((e) => {
			console.log(e);
		});
	},
	deactivate() {
		subscriptions && subscriptions.dispose();
		panel && panel.destroy();
		editors && editors.destroy();
		output && output.destroy();
	},
	serialize() {
		return store.serialize();
	},

	consumeGoconfig (service) {
		goconfig = service;
		goconfig.locator.findTool("dlv").then((p) => {
			path = p;
			this.start();
		});
	},

	start() {
		if (!dependenciesInstalled || !path) {
			return;
		}

		// load all dependencies once after everything is ready
		// this reduces the initial load time of this package

		store = require("./store");
		store.store.dispatch({ type: "INITIAL_STATE", state: initialState });
		store.store.dispatch({ type: "SET_DLV_PATH", path: path });

		delve = require("./delve");
		editors = require("./editors");
		panel = require("./panel.jsx");
		output = require("./output.jsx");

		panel.init();

		subscriptions.add(
			atom.commands.add("atom-workspace", {
				"go-debug:runTests":    () => delve.runTests(currentFile()),
				"go-debug:runPackage":  () => delve.runPackage(currentFile()),
				"go-debug:continue":    () => delve.command("continue"),
				"go-debug:next":        () => delve.command("next"),
				"go-debug:step":        () => delve.command("step"),
				"go-debug:restart":     () => delve.restart(),
				"go-debug:stop":        () => delve.stop(),
				"go-debug:togglePanel": () => store.store.dispatch({ type: "TOGGLE_PANEL" })
			})
		);
	}
};
