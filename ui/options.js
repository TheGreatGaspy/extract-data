/* 
 This Code is published under the terms and conditions of the CC-BY-NC-ND-4.0
 (https://creativecommons.org/licenses/by-nc-nd/4.0)
 
 Please contribute to the current project.
 
 SPDX-License-Identifier: CC-BY-NC-ND-4.0
 @author: pdulvp@laposte.net
 */

var browser = compat.adaptBrowser();
var rules = [];

var optionsUi = {
	activeRules: function() {
		let left = document.getElementById("left");
		let activeIds = Array.from(left.childNodes).filter(x => common.hasClass(x, "active")).map(x => x.getAttribute("rule-id"));
		return activeIds;
	},

	lastActiveRule: function() {
		let left = document.getElementById("left");
		var lastActiveId = Array.from(left.childNodes).filter(x => common.hasClass(x, "active")).map(x => x.getAttribute("rule-id")).find(x => true);
		return lastActiveId;
	}
}

function updateRules(response) {
	rules = response.rules;
	var left = document.getElementById("left");
	var activeIds = optionsUi.activeRules();
	while (left.firstChild) {
		left.removeChild(left.lastChild);
	}
	rules.forEach(rule => {
		var item = createRuleEntry(rule);
		left.appendChild(item);
	});
	Array.from(left.childNodes).filter(x => activeIds.includes(x.getAttribute("rule-id"))).forEach(x => common.addClass(x, "active"));
}

common.registerEditor(document.getElementById("left"), editor => {
	var lastActiveId = editor.getAttribute("rule-id");
	let rule = rules.find(r => r.id == lastActiveId);
	if (rule != null) {
		return rule.name;
	}
	return "";

}, editor => {
	var lastActiveId = editor.getAttribute("rule-id");
	let rule = rules.find(r => r.id == lastActiveId);
	if (rule != null) {
		rule.name = editor.value;
	}
});

document.getElementById("left").addEventListener("keydown", event => {
	if (event.code == "Delete") {
		var ruleIds = optionsUi.activeRules();
		
		if (ruleIds.length > 0) {
			let nextId = findNextAfterDeletion(rules, ruleIds[ruleIds.length-1]);
			rules = rules.filter(x => !ruleIds.includes(x.id));

			if (rules.length == 0) {
				let ruleName = browser.i18n.getMessage("new_rule_name", ""+(rules.length+1));
				rules.push({ id: common.uuidv4(), name: ruleName, sitematch: "", items: [] });
				nextId = rules[rules.length-1].id;
			}
			updateRules({rules: rules});
			clickOnRule(null, nextId);
		}
	}
});

document.getElementById("left").addEventListener("click", event => {
	if (common.hasClass(event.target, "left-pane-item")) {
		var lastActiveId = optionsUi.lastActiveRule();
		clickOnRule(lastActiveId, event.target.getAttribute("rule-id"));
	}
});

var table = document.getElementById("table-cache");
table.addEventListener("click", event => {
	let target = event.target;
	if (common.hasClass(target, "table-column")) {
		target = target.parentNode;
	}
	if (common.hasClass(target, "table-column-wrapper-2")) {
		target = target.parentNode;
	}
	if (common.hasClass(target, "table-column-wrapper")) {
		target = target.parentNode;
	}
	if (common.hasClass(target, "table-column")) {
		target = target.parentNode;
	}
	if (common.hasClass(target, "table-row")) {
		clickOnItem(target.getAttribute("id"));
	}
});

common.registerEditor(document.getElementById("table-cache"), editor => {
	var left = document.getElementById("left");
	var lastActiveId = optionsUi.lastActiveRule();
	let rule = rules.find(r => r.id == lastActiveId);
	if (rule) {
		var lastItemId = editor.getAttribute("item-id");
		var itemData = editor.getAttribute("item-data");
		let item = rule.items.find(i => i.id == lastItemId);
		if (item != null) {
			return item[itemData];
		}
	}
	return "";

}, editor => {
	var left = document.getElementById("left");
	var lastActiveId = optionsUi.lastActiveRule();
	let rule = rules.find(r => r.id == lastActiveId);
	if (rule) {
		var lastItemId = editor.getAttribute("item-id");
		var itemData = editor.getAttribute("item-data");
		let item = rule.items.find(i => i.id == lastItemId);
		if (item != null) {
			item[itemData] = editor.value;
		}
	}
	return "";
});

function findNextAfterDeletion(items, id) {
	let nextId = null;
	let lastIndex = items.findIndex(x => x.id == id);
	if (lastIndex >= 0 && lastIndex < items.length -1) {
		nextId = items[lastIndex + 1].id;
	} else if (lastIndex > 0) {
		nextId = items[lastIndex - 1].id;
	}
	return nextId;
}

document.getElementById("table-cache").addEventListener("keydown", event => {
	if (event.code == "Delete") {
		var left = document.getElementById("left");
		var cache = document.getElementById("table-cache");
		var itemIds = Array.from(cache.childNodes).filter(x => common.hasClass(x, "active")).map(x => x.getAttribute("id"));
		
		var lastRuleId = Array.from(left.childNodes).filter(x => common.hasClass(x, "active")).map(x => x.getAttribute("rule-id")).find(x => true);
		let rule = rules.find(r => r.id == lastRuleId);
		
		if (itemIds.length > 0) {
			let nextId = findNextAfterDeletion(rule.items, itemIds[itemIds.length-1]);
			rule.items = rule.items.filter(x => !itemIds.includes(x.id));
			
			updateRules({rules: rules});
			clickOnRule(lastRuleId, lastRuleId);
			clickOnItem(nextId);
			cache.focus();
		}
	}
});




if (document.getElementById("field-sitematch")) {
	document.getElementById("field-sitematch").oninput = function (event) {
		var lastActiveId = optionsUi.lastActiveRule();
		let rule = rules.find(r => r.id == lastActiveId);
		if (rule) {
			rule.sitematch = event.target.value;
		}
	};
}

function clickOnItem(itemId) {
	var cache = document.getElementById("table-cache");
	Array.from(cache.childNodes).forEach(x => common.removeClass(x, "active"));
	Array.from(cache.childNodes).filter(x => x.getAttribute("id") == itemId).forEach(x => common.addClass(x, "active"));
}

function clickOnRule(previousRuleId, ruleId) {
	if (previousRuleId != null) {
		saveCurrentRule(previousRuleId);
	}
	
	Array.from(left.childNodes).forEach(x => common.removeClass(x, "active"));
	Array.from(left.childNodes).filter(x => x.getAttribute("rule-id") == ruleId).forEach(x => {
		common.addClass(x, "active");
		x.focus();	
	});

	let rule = rules.filter(x => x.id == ruleId)[0];
	if (rule != null && rule.sitematch != undefined) {
		document.getElementById("field-sitematch").value = rule.sitematch;
	} else {
		document.getElementById("field-sitematch").value = "";
	}

	var table = document.getElementById("table-cache");
	if (!common.hasClass(table, "invisible")) {
		while (table.childNodes.length > 1) {
			table.removeChild(table.lastChild);
		}
		if (rule.items) {
			rule.items.forEach(i => {
				table.appendChild(createCacheEntry(i));
			});
		}
	} else {
		var table = document.getElementById("table-editor");
		while (table.childNodes.length > 1) {
			table.removeChild(table.lastChild);
		}
		table.appendChild(createCacheEditor(rule.items));
	}
}

function setItemResult(itemResult) {
	var table = document.getElementById("table-cache");
	var row = Array.from(table.childNodes).find(e => e.id == itemResult.id);
	let icon = Array.from(row.childNodes).find(e => e.getAttribute("class").indexOf("icon") > -1);
	let value = Array.from(row.childNodes).find(e => e.getAttribute("class") == "table-column table-column-value");
	if (icon) {
		if (itemResult.valid) {
			common.addClass(row, "valid");
			common.removeClass(icon, "icon-warning");
			common.addClass(icon, "icon-valid");
			value.textContent = itemResult.value;
		} else {
			common.addClass(row, "warning");
			common.removeClass(icon, "icon-valid");
			common.addClass(icon, "icon-warning");
			value.textContent = " ";
		}
	}
}

function saveCurrentRule(ruleId) {
	console.log("saveCurrentRule");
	if (ruleId) {
		let rule = rules.find(r => r.id == ruleId);
		if (rule) {
			if (document.getElementById("field-sitematch")) {
				rule.sitematch = document.getElementById("field-sitematch").value;
			}
			var table = document.getElementById("table-editor");
			if (!common.hasClass(table, "invisible")) {
				let items = [];
				try {
					let obj = JSON.parse(table.lastChild.firstChild.value);
					if (Array.isArray(obj)) {
						obj.forEach(i => {
							let item = { id : common.uuidv4(), name: i.name, expression: i.expression};
							if (!(typeof item.name === 'string' || item.name instanceof String)) {
								let itemName = browser.i18n.getMessage("new_item_name", ""+(items.length+1));
								item.name = itemName;
							}
							if (!(typeof item.expression === 'string' || item.expression instanceof String)) {
								item.expression = "";
							}
							items.push(item);
						});
					}
					rule.items = items;
				} catch (e) {
					console.log(e);
				}
			}
			
		}
	}
}

function createRuleEntry(rule) {
    var node = document.createElement("input");
	common.addClass(node, "left-pane-item");
	node.value = rule.name;
	node.setAttribute("rule-id", rule.id);
	node.setAttribute("readonly", "readonly");
	return node;
}

function createCacheEntry(item) {
	let node = document.createElement("div");
	node.setAttribute("id", item.id);
	common.addClass(node, "table-row");

	let child = null;
	child = document.createElement("div");
	common.addClass(child, "table-column table-column-icon");
	child.textContent = item.icon;
	node.appendChild(child);

	child = document.createElement("input");
	common.addClass(child, "table-column table-column-name");
	child.setAttribute("item-id", item.id);
	child.setAttribute("item-data", "name");
	child.value = item.name;
	child.setAttribute("readonly", "readonly");
	node.appendChild(child);

	child = document.createElement("input");
	child.setAttribute("type", "text");
	common.addClass(child, "table-column table-column-expression");
	child.setAttribute("item-id", item.id);
	child.setAttribute("item-data", "expression");
	child.value = item.expression;
	child.setAttribute("readonly", "readonly");
	node.appendChild(child);

	child = document.createElement("div");
	common.addClass(child, "table-column table-column-value");
	child.textContent = "";
	node.appendChild(child);

	return node;
}

function createCacheEditor(items) {
	let node = document.createElement("div");
	common.addClass(node, "table-row table-editor-row");

	let child = null;
	child = document.createElement("textarea");
	common.addClass(child, "table-column table-column-editor");

	let content = [];
	items.forEach(i => {
		let item = {};
		item.name = i.name;
		item.expression = i.expression;
		content.push(item);
	});
	child.value = JSON.stringify(content, null, 2);
	node.appendChild(child);

	return node;
}

common.registerDropdownMenu(document.getElementById("button-inspect"), document.getElementsByClassName("popup-menu")[0], (menu) => {
	return new Promise((resolve, reject) => {
		while (menu.firstChild) {
			menu.removeChild(menu.lastChild);
		}
		var lastActiveId = optionsUi.lastActiveRule();
		let rule = rules.find(r => r.id == lastActiveId);
		if (rule) {
			browser.tabs.query({}, (tabs) => {
				tabs = tabs.filter(t => common.doesMatch(t.url, rule.sitematch));
				if (tabs.length == 0) {
					let child = document.createElement("div");
					common.addClass(child, "menuitem-iconic");
					child.setAttribute("enabled", "false");
					
					child.textContent = browser.i18n.getMessage("options_opened_tab");
					menu.appendChild(child);
				} else {
					tabs.forEach(t => {
						let child = document.createElement("div");
						common.addClass(child, "menuitem-iconic");
						child.setAttribute("tab-id", t.id);
						child.textContent = t.title;
						menu.appendChild(child);
					});
				}

				resolve();
			});
		}
	});
}, event => {
	console.log(event);
	let tabId = event.target.getAttribute("tab-id");
	browser.tabs.query({}, (tabs) => {
		console.log(tabs);
		let tab = tabs.filter(x => x.id == tabId).find(x => true);
		var lastActiveId = optionsUi.lastActiveRule();

		browser.tabs.update(tab.id, { active: true}).then(result => {
			var sending = browser.tabs.sendMessage(tab.id, { "action": "highlight", rule: rules.find(r => r.id == lastActiveId) } );
			sending.then(result => {
				result.rulesResults.find(r => r.id == lastActiveId).itemsResults.forEach(itemResult => {
					setItemResult(itemResult);
				});
			}, x => {});
		}, x => {});
		
		//sendResponse({"response": "wait", "action" : request.action }); 

	});


});


//common.registerDropdownMenu(document.getElementById("button-variables"), document.getElementsByClassName("popup-menu")[0], clickPopupItem);

function clickPopupItem(event) {
	console.log(event);
}

document.getElementById("button-open").onclick = function (event) {
	let url = document.getElementById("field-sitematch").value;
	url = url.replace(/\\([\.\?\[\]\(\)\\\^\$\{\}\+])/g, "$1");
	browser.tabs.create( {
		url: url, 
		active: true
	 } );
};

 document.getElementById("button-ok").onclick = function (event) {
	var lastRuleId = Array.from(left.childNodes).filter(x => common.hasClass(x, "active")).map(x => x.getAttribute("rule-id")).find(x => true);
	if (lastRuleId != null) {
		saveCurrentRule(lastRuleId);
	}
	
	common.storage.setRules({
		"rules": rules
	}).then(() => {
		common.storage.removeRulesChangedListener(logStorageChange);
		window.close();
	}, (error) => {
		console.log(error);
		common.storage.removeRulesChangedListener(logStorageChange);
		window.close();
	});
 };

 document.getElementById("button-cancel").onclick = function (event) {
	common.storage.removeRulesChangedListener(logStorageChange);
	window.close();
 };

 document.getElementById("button-new-rule").onclick = function (event) {
	console.log(rules);
	let ruleName = browser.i18n.getMessage("new_rule_name", ""+(rules.length+1));
	rules.push({ id: common.uuidv4(), name: ruleName, sitematch: "", items: [] });
	updateRules( { rules: rules } );
 };

 document.getElementById("button-advanced").onclick = function (event) {
	var lastRuleId = Array.from(left.childNodes).filter(x => common.hasClass(x, "active")).map(x => x.getAttribute("rule-id")).find(x => true);
	if (lastRuleId != null) {
		saveCurrentRule(lastRuleId);
	}
	if (!common.hasClass(document.getElementById("table-cache"), "invisible")) {
		common.addClass(document.getElementById("table-cache"), "invisible");
		common.removeClass(document.getElementById("table-editor"), "invisible");
	} else {
		common.removeClass(document.getElementById("table-cache"), "invisible");
		common.addClass(document.getElementById("table-editor"), "invisible");
	}
	clickOnRule(null, lastRuleId);
 };

 document.getElementById("button-new-item").onclick = function (event) {
	var lastActiveId = optionsUi.lastActiveRule();
	let rule = rules.find(r => r.id == lastActiveId);
	if (rule) {
		let itemName = browser.i18n.getMessage("new_item_name", ""+(rule.items.length+1));
		rule.items.push({ id: common.uuidv4(), name: itemName, expression: "" });
	}
	updateRules( { rules: rules } );
	clickOnRule(lastActiveId, lastActiveId);
 };
 
 document.getElementById("left").addEventListener('wheel', function (event) {
	document.getElementById("left").scrollLeft += (event.deltaY * 30);
 });

function restoreWindow() {
	var urlParams = new URLSearchParams(window.location.search);
	if (urlParams.has('initialRule')) {
		let lastActiveId = urlParams.get('initialRule');
		let itemId = null;
		if (urlParams.has('initialItem')) {
			itemId = urlParams.get('initialItem');
		}
		restoreOptions(lastActiveId, itemId);
	} else {
		restoreOptions(0);
	}
}

function restoreOptions(idIndex, itemId) {
	let ruleIdIndex = idIndex;
	var lastActiveId = optionsUi.lastActiveRule();
	if (lastActiveId != null) {
		ruleIdIndex = idIndex;
	}
	
	common.storage.getRules().then((res) => {
		if (res.rules && Array.isArray(res.rules)) {
			updateRules( { rules: res.rules } );
			let ruleId = ruleIdIndex;
			if (Number.isInteger(ruleIdIndex) && ruleIdIndex < rules.length) {
				ruleId = rules[ruleIdIndex].id;
			}
			let rule = rules.find(r => r.id == ruleId);
			if (rule) {
				clickOnRule(null, ruleId);
				clickOnItem(itemId);
			}
		} else {
			updateRules( { rules: [] } );
		}
	}, (error) => {
		updateRules( { rules: [] } );
	});
}

function logStorageChange(changes) {
	restoreOptions();
}

document.getElementById("label-site").textContent = browser.i18n.getMessage("label_site");
document.getElementById("button-open").title = browser.i18n.getMessage("button_open"); 
document.getElementById("button-inspect").title = browser.i18n.getMessage("button_inspect"); 
document.getElementById("button-advanced").title = browser.i18n.getMessage("button_advanced"); 
document.getElementById("button-new-rule").textContent = browser.i18n.getMessage("button_new_rule");
document.getElementById("button-new-item").textContent = browser.i18n.getMessage("button_new_item");
document.getElementById("button-cancel").textContent = browser.i18n.getMessage("button_cancel");
document.getElementById("button-ok").textContent = browser.i18n.getMessage("button_ok");
document.getElementById("table-column-value").textContent = browser.i18n.getMessage("table_column_value");
document.getElementById("table-column-name").textContent = browser.i18n.getMessage("table_column_name");
document.getElementById("table-column-expression-text").textContent = browser.i18n.getMessage("table_column_expression");


document.addEventListener('DOMContentLoaded', restoreWindow);
common.storage.addRulesChangedListener(logStorageChange);

function handleMessage(request, sender, sendResponse) {
	if (request.action == "setSelection") {
		restoreOptions(request.initialRule, request.initialItem);
	}
}

browser.runtime.onMessage.addListener(handleMessage);