$(document).ready(function() {
	/* $.get("cards.xml", function(data){
		$("#results #RXSIO")[0].value = data.firstChild.outerHTML;
	}, "xml"); */
	
	
	$("#update")[0].addEventListener("click", function() {
		let data = $("#results #RXSIO")[0].value;
		if (data.search("<root>") == -1) {
			data = "<root>" + data;
		}
		if (data.search("</root>") == -1) {
			data = data + "</root>";
		}
		data = data.replace(/\n|\t/g, "");
		let sheet = $.parseXML(data);
		let unitNodeSet = [];
		let units = pathFinderPlus(sheet, "/root/unit", 5)
		let unit;
		while(unit = units.iterateNext()) {
			unitNodeSet.push(unit);
		}
		xmlRegularize(sheet, unitNodeSet);
		$("#RXSIO")[0].value = sheet.firstChild.outerHTML;
	});
});

function xmlRegularize(cardsSheet, unitNodeSet) {
	let cards = [];
	for(let i of unitNodeSet) {
		let tempCards = unitToCards(cardsSheet, i);
		for(let j of tempCards) {
			cards.push(j);
		}
	}
	for(let i = 1; i < cards.length; ++i) {
		if(isMutating(cards[i - 1], cards[i])) {
			alert("The unit set provided is not in increasing stats");
			return;
		}
	}
	for(let i = 1; i < cards.length; ++i) {
		cards[i].attack = cards[i - 1].attack * getGrowth(cards[0].attack, cards[cards.length - 1].attack, cards.length);
		cards[i].health = cards[i - 1].health * getGrowth(cards[0].health, cards[cards.length - 1].health, cards.length);
		cards[i].cost = cards[i - 1].cost * getGrowth(cards[0].cost, cards[cards.length - 1].cost, cards.length);
		for(const x of cards[i - 1].skills.keys()) {
			let bSkill = cards[i - 1].skills.has(x) ? cards[i - 1].skills.get(x) : {x: 1, n: 1, c: 7};
			let aSkill = cards[i].skills.get(x);
			for(let i in bSkill) {
				switch(i) {
					case "x": {
						if(aSkill[i])
							aSkill[i] = bSkill[i] * getGrowth(
								cards[0].skills.get(x) ? cards[0].skills.get(x)[i] : 1, 
								cards[cards.length - 1].skills.get(x)[i], 
								cards.length);
						break;
					}
					case "n": {
						if(!aSkill["all"] && aSkill[i])
							aSkill[i] = bSkill[i] * getGrowth(
								cards[0].skills.get(x) && cards[0].skills.get(x)[i] ? cards[0].skills.get(x)[i] : 1, 
								cards[cards.length - 1].skills.get(x) && cards[cards.length - 1].skills.get(x)[i] ? cards[cards.length - 1].skills.get(x)[i] : 5, 
								cards.length);
						break;
					}
					case "c": {
						if(aSkill[i])
							aSkill[i] = bSkill[i] * getGrowth(
								cards[0].skills.get(x) && cards[0].skills.get(x)[i] ? cards[0].skills.get(x)[i] : 7, 
								cards[cards.length - 1].skills.get(x) && cards[cards.length - 1].skills.get(x)[i] ? cards[cards.length - 1].skills.get(x)[i] : 1, 
								cards.length);
						break;
					}
					default: {
						break;
					}
				}
			}
		}
	}
	for(let i = 1; i < cards.length; ++i) {
		cards[i].attack = Math.round(cards[i].attack);
		cards[i].health = Math.round(cards[i].health);
		cards[i].cost = Math.round(cards[i].cost);
		for(let x of cards[i].skills.values()) {
			for(let i in x) {
				switch(i) {
					case "x":
					case "n":
					case "c": {
						x[i] = Math.round(x[i]);
						break;
					}
					default: {
						break;
					}
				}
			}
		}
	}
	console.log(cards);
	for(let card of cards) {
		let path = 
			card.level == 1 ? 
			"/root/unit[id = " + card.base_id +"]" : 
			"/root/unit[id = " + card.base_id +"]/upgrade[level = " + card.level + "]";
		let level = pathFinderPlus(cardsSheet, path, 5).iterateNext();
		//attack
		let currentNode = pathFinderPlus(cardsSheet, "attack", 5, level).iterateNext();
		if(!currentNode) {
			currentNode = cardsSheet.createElement("attack");
			currentNode.appendChild(cardsSheet.createTextNode(card.attack));
			level.appendChild(currentNode);
		}
		//health
		currentNode = pathFinderPlus(cardsSheet, "health", 5, level).iterateNext();
		if(!currentNode) {
			currentNode = cardsSheet.createElement("health");
			currentNode.appendChild(cardsSheet.createTextNode(card.health));
			level.appendChild(currentNode);
		}
		//cost
		currentNode = pathFinderPlus(cardsSheet, "cost", 5, level).iterateNext();
		if(!currentNode) {
			currentNode = cardsSheet.createElement("cost");
			currentNode.appendChild(cardsSheet.createTextNode(card.cost));
			level.appendChild(currentNode);
		}
		//skills
		
		if(card.level == 1) {
			for(let x of card.skills.values()) {
				currentNode = pathFinderPlus(cardsSheet, "skill[@id = '" + x.id + "']", 5, level).iterateNext();
				for(let i in x) {
					currentNode[i] = x[i];
				}
			}
		} else {
			//remove skills
			{
				let skillNodeResult = pathFinderPlus(cardsSheet, "skill", 5, level);
				let skillNodes = [];
				let skillNode;
				while(skillNode = skillNodeResult.iterateNext()) {
					skillNodes.push(skillNode);
				}
				$(skillNodes).remove();
			}
			//add skills
			for(let x of card.skills.values()) {
				currentNode = cardsSheet.createElement("skill");
				for(let i in x) {
					$(currentNode).attr(i, x[i]);
				}
				level.appendChild(currentNode);
			}
		}
		
	}
}

function pathFinderPlus(sheet, path, type = 0, node = sheet) {
	let nodes = sheet.evaluate(path, node, null, type, null);
	return nodes;
}

function getGrowth(initialStat, finalStat, levels = 18) {
	return Math.pow(finalStat/initialStat, 1 / (levels - 1));
}

class Card {
	constructor(cardObject = Card.baseCard) {
		for(let i in Card.baseCard) {
			if (cardObject[i]) {
				this[i] = cardObject[i];
			} else {
				if (i == "base_id") {
					this[i] = this["card_id"];
				} else if (i == "skills") {
					this[i] = new Map();
				} else if (i == "maxLevel") {
					this[i] = this["level"];
				} else {
					this[i] = Card.baseCard[i];
				}
			}
		}
	}
}

Card.baseCard = {
	card_id: 1, base_id: 1, name: "", picture: "", asset_bundle: 0,
	fusion_level: 0, attack: 0, health: 1, cost: 0, rarity: 1, skills: new Map(),
	type: 1, level: 1, maxLevel: 1
};

class xSkill {
	constructor(sheet, skillNode) {
		let path = "@*";
		let attributes = pathFinderPlus(sheet, path, 0, skillNode);
		let x = attributes.iterateNext();
		while (x) {
			if (x.nodeName == "id" || x.nodeName == "s" || x.nodeName == "s2" || x.nodeName == "trigger") {
				this[x.nodeName] = x.nodeValue;
			} else {
				this[x.nodeName] = Number(x.nodeValue);
			}
			x = attributes.iterateNext();
		}
	}
}


function unitToCards(sheet, unitNode) {
	let cards =[];
	let temp = {
		card_id: 1, base_id: 1, name: "", picture: "", asset_bundle: 0,
		fusion_level: 0, attack: 0, health: 1, cost: 0, rarity: 1, skills: new Map(),
		type: 1, level: 1, maxLevel: 1
	};
	let path = "./*";
	do {
		let skillArray = new Map();
		let nodes = pathFinderPlus(sheet, path, 4, unitNode);
		let cur = nodes.iterateNext();
		while (cur) {
			if (cur.nodeType == 3 || cur.nodeType == 8) {
				continue;
			} else {
				switch (cur.nodeName) {
					case "id": {
						temp.base_id = Number(cur.textContent);
						temp.card_id = temp.base_id;
						break;
					}
					//these two are strings.
					case "name":
					case "picture": {
						temp[cur.nodeName] = cur.textContent;
						break;
					}
					case "skill": {
						skillArray.set(pathFinderPlus(sheet, "./@id", 2, cur).stringValue, new xSkill(sheet, cur));
						break;
					}
					case "upgrade": { //no upgrade nodes in upgrade nodes, so this is fine.
						++temp.maxLevel;
						break;
					}
					default: {
						if (cur.textContent) {
							temp[cur.nodeName] = Number(cur.textContent);
						}
					}
				}
			}
			cur = nodes.iterateNext();
		}
		
		if (skillArray.size > 0) {
			temp.skills = skillArray;
		}
		cards.push(new Card(temp));
		
		path = "./upgrade[level = " + (temp.level + 1) + "]/*";
	} while(temp.maxLevel > temp.level);
	return cards;
}


//bUnit > aUnit
function isMutating(bUnit, aUnit) {
	if(bUnit.attack > aUnit.attack)
		return true;
	if(bUnit.health > aUnit.health)
		return true;
	if(bUnit.cost < aUnit.cost)
		return true;
	if(bUnit.type != aUnit.type)
		return true;
	if(bUnit.skills.size > aUnit.skills.size)
		return true;
	for(const x of bUnit.skills.keys()) {
		let bSkill = bUnit.skills.get(x);
		if(!aUnit.skills.has(x))
			return true;
		let aSkill = aUnit.skills.get(x);
		for(let i in bSkill) {
			switch(i) {
				case "x": {
					if(bSkill[i] > aSkill[i])
						return true;
					break;
				}
				case "y": {
					if(aSkill[i] && bSkill[i] != aSkill[i])
						return true;
					break;
				}
				case "all": {
					if(!aSkill[i])
						return true;
					break;
				}
				case "n": {
					if(!aSkill["all"] && ( !aSkill[i] || ( aSkill[i] && bSkill[i] > aSkill[i] ) ) )
						return true;
					break;
				}
				case "c": {
					if(aSkill[i] && bSkill[i] < aSkill[i])
						return true;
					break;
				}
				case "s":
				case "s2": {
					if(bSkill[i] != aSkill[i])
						return true;
					break;
				}
				default: {
					break;
				}
			}
		}
	}
	return false;
}