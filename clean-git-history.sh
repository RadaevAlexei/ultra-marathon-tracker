#!/bin/bash

echo "🧹 Очистка истории Git от секретов"
echo "=================================="

# Проверяем, что мы в git репозитории
if [ ! -d ".git" ]; then
    echo "❌ Это не git репозиторий!"
    exit 1
fi

echo "⚠️  ВНИМАНИЕ: Этот скрипт перезапишет историю Git!"
echo "📋 Убедитесь, что у вас есть резервная копия!"
echo ""
read -p "Продолжить? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Отменено"
    exit 1
fi

echo "🔄 Удаляем .env из истории Git..."

# Удаляем .env из истории
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env' --prune-empty --tag-name-filter cat -- --all

echo "🔄 Удаляем env.example из истории (если содержал секреты)..."

# Удаляем env.example из истории
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch env.example' --prune-empty --tag-name-filter cat -- --all

echo "🧹 Очищаем ссылки..."

# Очищаем ссылки
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin

echo "🗑️  Удаляем старые объекты..."

# Принудительно удаляем старые объекты
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "✅ История Git очищена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Обновите токен в .env файле"
echo "2. Запустите: node setup-webhook.js"
echo "3. Сделайте новый коммит: git add . && git commit -m 'Security: Remove secrets from history'"
echo "4. Принудительно отправьте: git push --force-with-lease origin main"
echo ""
echo "⚠️  ВАЖНО: Все, кто клонировал репозиторий, должны сделать:"
echo "   git fetch origin"
echo "   git reset --hard origin/main"
