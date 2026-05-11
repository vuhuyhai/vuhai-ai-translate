# ================================
# VuHai AI Translate — Build Tasks
# ================================

APP_NAME    = vuhai-ai-translate
VERSION     = $(shell node -p "require('./package.json').version")
RELEASE_DIR = release

.PHONY: all web windows macos linux clean release checksums icons

# Build web + windows (trên máy Windows)
all: clean web windows
	@echo "Build hoan tat! Xem thu muc $(RELEASE_DIR)/"

# Tao icon
icons:
	@echo "Tao icons..."
	node scripts/generate-icons.mjs
	@echo "Icons xong!"

# Build web (Vite)
web:
	@echo "Building web..."
	npm ci
	npm run build
	@echo "Web build xong -> dist/"

# Build Windows
windows:
	@echo "Building Windows..."
	npx tauri build --bundles nsis,msi
	mkdir -p $(RELEASE_DIR)/windows
	cp "src-tauri/target/release/bundle/nsis/"*.exe $(RELEASE_DIR)/windows/
	cp "src-tauri/target/release/bundle/msi/"*.msi $(RELEASE_DIR)/windows/
	@echo "Windows build xong -> $(RELEASE_DIR)/windows/"

# Build macOS (phai chay tren may Mac)
macos:
	@echo "Building macOS (Universal)..."
	rustup target add x86_64-apple-darwin aarch64-apple-darwin
	npx tauri build --target universal-apple-darwin --bundles dmg,app
	mkdir -p $(RELEASE_DIR)/macos
	cp src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg $(RELEASE_DIR)/macos/
	@echo "macOS build xong -> $(RELEASE_DIR)/macos/"

# Build Linux (phai chay tren Linux)
linux:
	@echo "Building Linux..."
	npx tauri build --bundles appimage,deb
	mkdir -p $(RELEASE_DIR)/linux
	cp src-tauri/target/release/bundle/appimage/*.AppImage $(RELEASE_DIR)/linux/
	cp src-tauri/target/release/bundle/deb/*.deb $(RELEASE_DIR)/linux/
	@echo "Linux build xong -> $(RELEASE_DIR)/linux/"

# Tao file checksum
checksums:
	@echo "Tao SHA256 checksums..."
	find $(RELEASE_DIR) -type f \( -name "*.exe" -o -name "*.msi" \
		-o -name "*.dmg" -o -name "*.AppImage" -o -name "*.deb" \) \
		-exec sha256sum {} \; > $(RELEASE_DIR)/checksums.sha256
	cat $(RELEASE_DIR)/checksums.sha256
	@echo "Checksums -> $(RELEASE_DIR)/checksums.sha256"

# Don dep
clean:
	@echo "Don dep..."
	rm -rf dist/ $(RELEASE_DIR)/
	@echo "Sach!"

# Build day du + checksums
release: all checksums
	@echo ""
	@echo "Release $(VERSION) san sang!"
	@echo "   Thu muc: $(RELEASE_DIR)/"
