import { ArticleStore, loadArmorData } from './article'
import { OutfitStore } from './outfit'

function main(): void {
    let outfitContainer = document.getElementById("outfitContainer") as HTMLDivElement;
    let articleContainer = document.getElementById("articleContainer") as HTMLDivElement;
    let armorLoader = document.getElementById("armorLoader") as HTMLLIElement;
    const menu = document.querySelector(".menu") as HTMLElement;

    if (!outfitContainer || !articleContainer || !armorLoader || !menu) {
        console.log("Unable to init app");
        return;
    }

    let articleWindow = document.getElementById("article-window") as HTMLDivElement;
    let outfitWindow = document.getElementById("outfit-window") as HTMLDivElement;
    let transformWindow = document.getElementById("transform-window") as HTMLDivElement;

    dragElement(articleWindow);
    resizeElement(articleWindow);
    dragElement(outfitWindow);
    resizeElement(outfitWindow);
    dragElement(transformWindow);
    resizeElement(transformWindow);

    globalThis.articleStore = new ArticleStore(articleContainer);
    globalThis.outfitStore = new OutfitStore(outfitContainer);
    armorLoader.addEventListener("click", loadArmorData);

    // Menu logic
    let menuVisible = false;
    function toggleMenu(command: string) {
        menu.style.display = command === "show" ? "block" : "none";
        if (command === "show") {
            let newZ = getHighestZ() + 1;
            menu.style.zIndex = String(newZ + 1);
        }
        menuVisible = !menuVisible;
    };

    function setPosition(origin: { top: number, left: number }) {
        menu.style.left = `${origin.left}px`;
        menu.style.top = `${origin.top}px`;
        toggleMenu("show");
    };

    window.addEventListener("click", function(e) {
        if (menuVisible) toggleMenu("hide");
    });

    window.addEventListener("contextmenu", function(e) {
        e.preventDefault();
        const origin = {
            left: e.pageX,
            top: e.pageY
        };
        setPosition(origin);
        return false;
    });

    let outfitAdder = document.getElementById("outfitAdder");
    outfitAdder ?.addEventListener("click", function(e) {
        globalThis.outfitStore.insert();
    });
}

function dragElement(elmnt: HTMLDivElement) {
    var pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;

    var header = getHeader(elmnt);

    elmnt.onmousedown = function() {
        elmnt.style.zIndex = String(getHighestZ() + 1);
    };

    if (header) {
        header.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e: MouseEvent) {
        e = e || window.event;
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e: MouseEvent) {
        if (!elmnt) {
            return;
        }

        e = e || window.event;
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = elmnt.offsetTop - pos2 + "px";
        elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
    }

    function closeDragElement() {
        /* stop moving when mouse button is released:*/
        document.onmouseup = null;
        document.onmousemove = null;
    }

    function getHeader(element: HTMLDivElement) {
        var headerItems = element.getElementsByClassName("window-header");

        if (headerItems.length === 1) {
            return headerItems[0] as HTMLDivElement;
        }

        return null;
    }
}

function resizeElement(elmnt: HTMLDivElement) {
    var startX: number, startY: number, startWidth: number, startHeight: number;

    var right = document.createElement("div");
    right.className = "resizer-right";
    elmnt.appendChild(right);
    right.addEventListener("mousedown", initDrag, false);

    var bottom = document.createElement("div");
    bottom.className = "resizer-bottom";
    elmnt.appendChild(bottom);
    bottom.addEventListener("mousedown", initDrag, false);

    var both = document.createElement("div");
    both.className = "resizer-both";
    elmnt.appendChild(both);
    both.addEventListener("mousedown", initDrag, false);

    function initDrag(e: MouseEvent) {
        startX = e.clientX;
        startY = e.clientY;
        let width: string = "50";
        let height: string = "50";
        if (document.defaultView) {
            width = document.defaultView.getComputedStyle(elmnt).width;
            height = document.defaultView.getComputedStyle(elmnt).height;
        }

        startWidth = parseInt(
            width,
            10
        );
        startHeight = parseInt(
            height,
            10
        );
        document.documentElement.addEventListener("mousemove", doDrag, false);
        document.documentElement.addEventListener("mouseup", stopDrag, false);
    }

    function doDrag(e: MouseEvent) {
        elmnt.style.width = startWidth + e.clientX - startX + "px";
        elmnt.style.height = startHeight + e.clientY - startY + "px";
    }

    function stopDrag() {
        document.documentElement.removeEventListener("mousemove", doDrag, false);
        document.documentElement.removeEventListener("mouseup", stopDrag, false);
    }
}

function getHighestZ() {
    var highestZ = 0;
    var divs = document.getElementsByTagName('div') as HTMLCollectionOf<HTMLDivElement>;

    for (var i = 0; i < divs.length; i++) {
        if (divs[i].style.zIndex) {
            var ii = parseInt(divs[i].style.zIndex);
            if (ii > highestZ) { highestZ = ii; }
        }
    }
    return highestZ;
}



main();
