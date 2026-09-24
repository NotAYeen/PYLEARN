export class WindowManager {
    constructor() {
        this.win = document.getElementById("docs-window");
        this.header = document.getElementById("docs-window-header");
        this.closeBtn = document.getElementById("docs-close");

        if (this.win) {
            this.bindCloseEvents();
            if (this.header) {
                this.initDrag();
            }
        }
    }

    bindCloseEvents() {
        if (this.closeBtn) {
            this.closeBtn.addEventListener("click", () => this.hideDoc());
        }

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !this.win.classList.contains("hidden")) {
                this.hideDoc();
            }
        });
    }

    initDrag() {
        let isDragging = false;
        let offsetX, offsetY;

        this.header.addEventListener("mousedown", (e) => {
            if (e.target.closest('#docs-close')) return;

            isDragging = true;
            offsetX = e.clientX - this.win.getBoundingClientRect().left;
            offsetY = e.clientY - this.win.getBoundingClientRect().top;
            document.body.style.userSelect = "none";
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;

            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            const maxLeft = window.innerWidth - this.win.offsetWidth;
            const maxTop = window.innerHeight - this.win.offsetHeight;

            if (newLeft < 0) newLeft = 0;
            if (newTop < 0) newTop = 0;
            if (newLeft > maxLeft) newLeft = maxLeft;
            if (newTop > maxTop) newTop = maxTop;

            this.win.style.left = newLeft + "px";
            this.win.style.top = newTop + "px";
            this.win.style.right = "auto";
        });

        document.addEventListener("mouseup", () => {
            isDragging = false;
            document.body.style.userSelect = "";
        });
    }

    showDoc(item) {
        document.getElementById("docs-item-name").textContent = item.name;
        document.getElementById("docs-item-desc").textContent = item.desc;
        document.getElementById("docs-item-example").textContent = item.example;
        this.win.classList.remove("hidden");
    }

    hideDoc() {
        this.win.classList.add("hidden");
    }
}