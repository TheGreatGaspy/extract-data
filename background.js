﻿/* 
 This code is published under CC BY-NC-ND 4.0
 (https://creativecommons.org/licenses/by-nc-nd/4.0)
 
 Please contribute to the current project.
 
 @author: pdulvp@laposte.net
 */
var results = [];

function equals(result1, result2) {
	if (result1 == undefined) {
		return (result2 == undefined);
	}
	if (result2 == undefined) {
		return (result1 == undefined);
	}
	if (result1.rulesResults.length != result2.rulesResults.length) {
		return false;
	}

	// Returns whether the item i1 doens't have an equal item into rule2
	let invalidItem = function (i1, rule2) {
		let i2 = rule2.itemsResults.find(i2 => i2.id == i1.id);
		if (i2 == undefined) {
			return true;

		} else if (i1.valid != i2.valid) {
			return true;

		} else if (i1.value != i2.value) {
			return true;

		}
		return false;
	}

	// Returns whether the rule r1 doens't have an equal rule into result2
	let invalidRule = function (r1, result2) {
		let r2 = result2.rulesResults.find(r2 => r2.id == r1.id);
		if (r2 == undefined) {
			return true;

		} else if (r1.itemsResults.length != r2.itemsResults.length) {
			return true;

		} else if (r1.itemsResults.find(i1 => invalidItem(i1, r2)) != undefined) {
			return true;

		}
		return false;
	};
	if (result1.rulesResults.find(r1 => invalidRule(r1, result2)) != undefined) {
		return false;
	}
	return true;
}

function handleMessage(request, sender, sendResponse) {
	if (request.action == "setResult") {
		if (!equals(results[sender.tab.id], request.result)) {
			results[sender.tab.id] = request.result;
			updateBadge(sender.tab.id);
			updateContextMenu(sender.tab);
			var sending = browser.runtime.sendMessage( { "action": "onResultChange", "tabId": sender.tab.id, "result": request.result } )
			sending.then((e) => {} , (e) => { });
		}

	} else if (request.action == "getResult") {
		sendResponse({result: results[request.tabId]});

	} else if (request.action == "setClickedElement") {
		updateContextMenu(sender.tab);
	}
}

function updateBadge(tabId) {
	if (results[tabId] != null) {
		let len = results[tabId].rulesResults.length;
		if (len != 0) {
			browser.browserAction.setBadgeTextColor({ color: "#FFFFFF" });
			browser.browserAction.setBadgeBackgroundColor({ color: "#29c74b" });

				browser.browserAction.getBadgeText({tabId: tabId}).then(e => {
					if (e != null && e.length > 0) {
						browser.browserAction.setBadgeBackgroundColor({ color: "#FF00FF" });
						browser.browserAction.setBadgeText({ text: ""+len, tabId: tabId });
						setTimeout(e => {
							browser.browserAction.setBadgeBackgroundColor({ color: "#29c74b" });
						}, 200);
					} else {
						browser.browserAction.setBadgeBackgroundColor({ color: "#29c74b" });
						browser.browserAction.setBadgeText({ text: ""+len, tabId: tabId });
					}
				});
			 
		} else {
			browser.browserAction.setBadgeText({ text: "", tabId: tabId });
		}
	} else {
		browser.browserAction.setBadgeText({ text: "", tabId: tabId });
	}
}

browser.runtime.onMessage.addListener(handleMessage);

function onStorageChange() {
	getStoredRules(updateRules);
}

function onTabChange(activeInfo) {
	browser.tabs.query({}, (tabs) => {
		let tab = tabs.filter(x => x.id == activeInfo.tabId).find(x => true);
		if (tab != undefined) {
			updateContextMenu(tab);
		}
	});
}

browser.storage.onChanged.addListener(onStorageChange);
browser.tabs.onActivated.addListener(onTabChange);

onStorageChange();

function getStoredRules(callback) {
	browser.storage.local.get('rules').then((res) => {
		if (res.rules && Array.isArray(res.rules)) {
			callback( { rules: res.rules } );
		} else {
			callback( { rules: [] } );
		}
	}, (error) => {
		callback( { rules: [] } );
	});
}

function onClickNotification(notification) {
	let ruleId = notification;
	let itemId = undefined;
	if (notification.indexOf("@")>0) {
		ruleId = notification.split("@")[0];
		itemId = notification.split("@")[1];
	}
	browser.notifications.getAll().then(ns => {
		if (ns[notification].title.indexOf("Rule") >= 0) {
			editRule(ruleId);
		} else if (ns[notification].title.indexOf("Item") >= 0) {
			editRule(ruleId, itemId);
		}
	});
}

browser.notifications.onClicked.addListener(onClickNotification);

function createNewRule(event, tabId) {
	getStoredRules(storage => {
		let ruleName = "Rule #"+(storage.rules.length+1);
		let storedRule = { id: uuidv4(), name: ruleName, sitematch: event.pageUrl, items: [] };
		storage.rules.push(storedRule);

		let itemName = "Item #"+(storedRule.items.length+1);
		let item = { id: uuidv4(), name: itemName, xpath: "" };
		storedRule.items.push(item);
		
		var sending = browser.tabs.sendMessage(tabId, { "action": "getContextMenuContext" } );
		sending.then(element => {
			item.xpath = element.xpath;
			storeRules( storage ).then(e => {
				browser.notifications.create(storedRule.id, {
					"type": "basic",
					"title": "Rule created",
					"message": "Click here to edit rule"
				}).then(e => {
					  setTimeout(ee => {
						var clearing = browser.notifications.clear(e );
					  }, 5000);
				});
			});
		}, x => {
			storeRules( storage );
		});
	});
}

function createNewItem(event, rule, tabId) {
	getStoredRules(storage => {
		let storedRule = storage.rules.find(r => r.id == rule.id);
		if (storedRule != null) {
			let itemName = "Item #"+(storedRule.items.length+1);
			let item = { id: uuidv4(), name: itemName, xpath: "" };
			storedRule.items.push(item);

			var sending = browser.tabs.sendMessage(tabId, { "action": "getContextMenuContext" } );
			sending.then(element => {
				item.xpath = element.xpath;
				storeRules(storage).then(e => {
					browser.notifications.create(storedRule.id+"@"+item.id, {
						"type": "basic",
						"title": "Item created",
						"message": "Click here to edit item"
					}).then(e => {
						  setTimeout(ee => {
							var clearing = browser.notifications.clear(e );
						  }, 5000);
					});
				});
			}, x => {
				console.log("err");
				storeRules( storage );
			});
		}
	});
}


function highlightRule(event, rule, tabId) {
	getStoredRules(storage => {
		let storedRule = storage.rules.find(r => r.id == rule.id);
		if (storedRule != null) {
			var sending = browser.tabs.sendMessage(tabId, { "action": "highlight", rule: storedRule } );
			sending.then(result => {}, x => {});
		}
	});
}

function editRule(ruleId, itemId) {
	openOptions(ruleId, itemId);
}

function editItem(event, rule, item, tabId) {
	getStoredRules(storage => {
		let storedRule = storage.rules.find(r => r.id == rule.id);
		if (storedRule != null) {
			let storedItem = storedRule.items.find(i => i.id == item.id);
			if (storedItem != null) {
				var sending = browser.tabs.sendMessage(tabId, { "action": "getContextMenuContext" } );
				sending.then(element => {
					item.xpath = element.xpath;
					storeRules( storage ).then(e => {
						browser.notifications.create(storedRule.id+"@"+storedItem.id, {
							"type": "basic",
							"title": "Item modified",
							"message": "Click here to edit item"
						}).then(e => {
							  setTimeout(ee => {
								var clearing = browser.notifications.clear(e );
							  }, 5000);
						});
					});
				}, x => {
					storeRules( storage );
				});
			}
		}
	});
}

function storeRules(storage) {
	return browser.storage.local.set(storage);
}

function updateRules(storage) {
	browser.contextMenus.create({
		id: `menu-new-rule`,
		title: `Create a new rule`,
		contexts: ["editable", "frame", "link", "image", "page", "selection"]
	});
	if (storage.rules.length > 0) {
		browser.contextMenus.create({
			id: `menu-new-rule-separator`,
			type: "separator",
			contexts: ["editable", "frame", "link", "image", "page", "selection"]
		});
	}
	storage.rules.forEach(rule => {
		browser.contextMenus.create({
			id: `menu-${rule.id}`,
			title: `${rule.name}`,
			contexts: ["editable", "frame", "link", "image", "page", "selection"]
		});
		browser.contextMenus.create({
			id: `menu-new-item-${rule.id}`,
			parentId: `menu-${rule.id}`,
			title: `Add a new item`,
			contexts: ["editable", "frame", "link", "image", "page", "selection"]
		});
		browser.contextMenus.create({
			id: `menu-edit-${rule.id}`,
			parentId: `menu-${rule.id}`,
			title: `Edit rule`,
			contexts: ["editable", "frame", "link", "image", "page", "selection"]
		});
		browser.contextMenus.create({
			id: `menu-highlight-${rule.id}`,
			parentId: `menu-${rule.id}`,
			title: `Highlight`,
			contexts: ["editable", "frame", "link", "image", "page", "selection"]
		});
		if (rule.items.length > 0) {
			browser.contextMenus.create({
				id: `menu-new-item-separator-${rule.id}`,
				parentId: `menu-${rule.id}`,
				type: "separator",
				contexts: ["editable", "frame", "link", "image", "page", "selection"]
			});
		}
		rule.items.forEach(item => {
			browser.contextMenus.create({
				id: `menu-${item.id}`,
				parentId: `menu-${rule.id}`,
				title: `Change '${item.name}'`,
				contexts: ["editable", "frame", "link", "image", "page", "selection"]
			});
		});
	});
}

function allowExtension(urlString) {
	let url = new URL(urlString);
	if (url.protocol == "mozextension:") {
		return false;
	}
	if (url.protocol == "about:") {
		return false;
	}
	return true;
}

function updateContextMenu(tab) {
	let createRule = allowExtension(tab.url);
	browser.contextMenus.update(`menu-new-rule`, {
		onclick: e => {
			createNewRule(e, tab.id);
		},
		visible: createRule
	});

	getStoredRules(storage => {
		let anyMatch = false;

		storage.rules.forEach(rule => {
			let match = tab.url == rule.sitematch;
			if (match) {
				anyMatch = true;
			}
			browser.contextMenus.update(`menu-${rule.id}`, {
				visible: match
			});
			browser.contextMenus.update(`menu-new-item-${rule.id}`, {
				onclick: e => {
					createNewItem(e, rule, tab.id);
				}
			});
			browser.contextMenus.update(`menu-highlight-${rule.id}`, {
				onclick: e => {
					highlightRule(e, rule, tab.id);
				}
			});
			browser.contextMenus.update(`menu-edit-${rule.id}`, {
				onclick: e => {
					editRule(rule.id);
				}
			});
			
			rule.items.forEach(item => {
				browser.contextMenus.update(`menu-${item.id}`, {
					onclick: e => {
						editItem(e, rule, item, tab.id);
					}
				});
			});

			if (results[tab.id] != null) {
				if (results[tab.id]) {
					let values = results[tab.id].rulesResults.find(r => r.id == rule.id );
					if (values != null) {
						rule.items.forEach(item => {
							let itemValue = values.itemsResults.find(i => i.id == item.id );
							if (itemValue != null) {
								let itemValid = itemValue.value != null;
								if (!itemValid) {
									browser.contextMenus.update(`menu-${item.id}`, {
										icons: {  "16": "ui/warn.svg",  "32": "ui/warn.svg" }
									});
								}
							} else {
								browser.contextMenus.update(`menu-${item.id}`, {
									icons: {  "16": "ui/warn.svg",  "32": "ui/warn.svg" }
								});
							}
						});
					}
				}
			}
		});

		browser.contextMenus.update(`menu-new-rule-separator`, {
			visible: anyMatch && createRule
		});
	});
}
