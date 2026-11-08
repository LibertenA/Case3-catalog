#!/usr/bin/env sh
# Запуск каталога на локальном сервере: http://localhost:8000
cd "$(dirname "$0")" || exit 1
echo "Каталог: http://localhost:8000  (остановить: Ctrl+C)"
python3 -m http.server 8000 || python -m http.server 8000
