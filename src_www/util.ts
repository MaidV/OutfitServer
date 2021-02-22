export function parse(file: File) {
    return new Promise((resolve, reject) => {
        const reader: FileReader = new FileReader();

        reader.onload = function(e: Event) {
            if (!this.result || this.result instanceof ArrayBuffer)
                return;
            resolve(JSON.parse(this.result));
        };

        reader.onerror = function(e: any) {
            reject(e);
        };

        reader.readAsText(file);
    })
}

export function updateFoldables() {
    let coll = document.getElementsByClassName("collapsible");
    for (let i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function() {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
            } else {
                content.style.display = "block";
            }
        });
    }
}

export function initWindow(elmnt: HTMLDivElement) {
    dragElement(elmnt);
    resizeElement(elmnt);
}

export function getHighestZ() {
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
        if (!elmnt)
            return;

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
    right.onmousedown = initDrag;

    var bottom = document.createElement("div");
    bottom.className = "resizer-bottom";
    elmnt.appendChild(bottom);
    bottom.onmousedown = initDrag;

    var both = document.createElement("div");
    both.className = "resizer-both";
    elmnt.appendChild(both);
    both.onmousedown = initDrag;

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


