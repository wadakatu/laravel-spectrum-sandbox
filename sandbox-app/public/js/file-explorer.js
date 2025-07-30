// File Explorer
class FileExplorer {
    constructor(terminalManager) {
        this.terminalManager = terminalManager;
        this.container = document.getElementById('file-tree');
        this.selectedFile = null;
        this.setupEventListeners();
    }
    setupEventListeners() {
        // Listen for refresh events
        window.addEventListener('refresh-file-tree', () => {
            this.refresh();
        });
    }

    async refresh() {
        try {
            const response = await fetch(`/api/sessions/${this.terminalManager.sessionId}/files`);
            const files = await response.json();
            this.render(files);
        } catch (error) {
            console.error('Failed to load file tree:', error);
        }
    }

    render(node, container = this.container, level = 0) {
        container.innerHTML = '';
        
        if (node.type === 'directory') {
            const dir = document.createElement('div');
            dir.className = 'file-tree-directory';
            
            const item = document.createElement('div');
            item.className = 'file-tree-item';
            item.style.paddingLeft = `${level * 20}px`;
            item.innerHTML = `
                <i class="bi bi-folder-fill text-warning"></i>
                <span>${node.name}</span>
            `;
            
            const children = document.createElement('div');
            children.className = 'file-tree-children';
            
            let expanded = level === 0; // Expand root by default
            
            item.addEventListener('click', () => {
                expanded = !expanded;
                children.style.display = expanded ? 'block' : 'none';
                item.querySelector('i').className = expanded 
                    ? 'bi bi-folder-open-fill text-warning' 
                    : 'bi bi-folder-fill text-warning';
            });
            
            dir.appendChild(item);
            dir.appendChild(children);
            container.appendChild(dir);
            
            if (node.children) {
                node.children.forEach(child => {
                    this.render(child, children, level + 1);
                });
            }
            
            if (expanded) {
                item.querySelector('i').className = 'bi bi-folder-open-fill text-warning';
            } else {
                children.style.display = 'none';
            }
        } else {
            const item = document.createElement('div');
            item.className = 'file-tree-item';
            item.style.paddingLeft = `${level * 20}px`;
            
            const icon = this.getFileIcon(node.name);
            item.innerHTML = `
                <i class="bi ${icon.class}" style="color: ${icon.color}"></i>
                <span>${node.name}</span>
            `;
            
            item.addEventListener('click', () => {
                this.selectFile(node, item);
            });
            
            container.appendChild(item);
        }
    }

    renderNode(node, parent = null, level = 0) {
        if (node.type === 'directory') {
            const dir = document.createElement('div');
            dir.className = 'file-tree-directory';
            dir.setAttribute('data-name', node.name);
            
            const item = document.createElement('div');
            item.className = 'file-tree-item';
            item.style.paddingLeft = `${level * 20}px`;
            item.innerHTML = `
                <i class="bi bi-folder-fill text-warning"></i>
                <span>${node.name}</span>
            `;
            
            const children = document.createElement('div');
            children.className = 'file-tree-children';
            
            let expanded = level === 0; // Expand root by default
            
            item.addEventListener('click', () => {
                expanded = !expanded;
                children.style.display = expanded ? 'block' : 'none';
                item.querySelector('i').className = expanded 
                    ? 'bi bi-folder-open-fill text-warning' 
                    : 'bi bi-folder-fill text-warning';
            });
            
            dir.appendChild(item);
            dir.appendChild(children);
            
            if (node.children) {
                node.children.forEach(child => {
                    const childElement = this.renderNode(child, dir, level + 1);
                    children.appendChild(childElement);
                });
            }
            
            if (expanded) {
                item.querySelector('i').className = 'bi bi-folder-open-fill text-warning';
            } else {
                children.style.display = 'none';
            }
            
            return dir;
        } else {
            const item = document.createElement('div');
            item.className = 'file-tree-item file-tree-file';
            item.style.paddingLeft = `${level * 20}px`;
            item.setAttribute('data-name', node.name);
            
            const icon = this.getFileIcon(node.name);
            item.innerHTML = `
                <i class="bi ${icon.class}" style="color: ${icon.color}"></i>
                <span>${node.name}</span>
            `;
            
            item.addEventListener('click', () => {
                this.selectFile(node, item);
            });
            
            return item;
        }
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'php': { class: 'bi-file-code', color: '#787cb5' },
            'js': { class: 'bi-file-code', color: '#f1e05a' },
            'json': { class: 'bi-file-code', color: '#cbcb41' },
            'yaml': { class: 'bi-file-code', color: '#cb4141' },
            'yml': { class: 'bi-file-code', color: '#cb4141' },
            'xml': { class: 'bi-file-code', color: '#e34c26' },
            'html': { class: 'bi-file-code', color: '#e34c26' },
            'css': { class: 'bi-file-code', color: '#563d7c' },
            'md': { class: 'bi-file-text', color: '#428bca' },
            'txt': { class: 'bi-file-text', color: '#cccccc' },
            'log': { class: 'bi-file-text', color: '#cccccc' }
        };
        
        return icons[ext] || { class: 'bi-file', color: '#cccccc' };
    }

    selectFile(file, element) {
        // Remove previous selection
        if (this.selectedFile) {
            this.selectedFile.classList.remove('selected');
        }
        
        // Add selection
        element.classList.add('selected');
        this.selectedFile = element;
        
        // Get full file path
        const path = this.getFilePath(file, element);
        
        // Dispatch event for editor to load the file
        window.dispatchEvent(new CustomEvent('file-selected', {
            detail: { path: path, file: file }
        }));
    }

    getFilePath(file, element) {
        // Build full path by traversing up the tree
        const pathParts = [file.name];
        let current = element.parentElement;
        
        while (current && current !== this.container) {
            const dirItem = current.previousElementSibling;
            if (dirItem && dirItem.classList.contains('file-tree-item')) {
                const dirName = dirItem.querySelector('span').textContent;
                if (dirName !== 'app') { // Skip root 'app' directory as it's implicit
                    pathParts.unshift(dirName);
                }
            }
            current = current.parentElement.parentElement;
        }
        
        // Prepend 'app/' to the path
        return 'app/' + pathParts.join('/');
    }
}

// Export for global use
window.FileExplorer = FileExplorer;