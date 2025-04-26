#!/bin/bash
docker exec -it roro_ai-web-1 bash -c "cat > /tmp/static_settings.py << 'END'
# Static files settings
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'theme/static'),
]
END"

# Append the settings
docker exec -it roro_ai-web-1 bash -c "cat /tmp/static_settings.py >> roro_ai/settings.py"

# Run collectstatic again
docker exec -it roro_ai-web-1 python manage.py collectstatic --noinput
