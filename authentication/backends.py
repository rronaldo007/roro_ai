from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

class EmailOrUsernameModelBackend(ModelBackend):
    # In your backends.py file, add these lines:
    def authenticate(self, request, username=None, password=None, **kwargs):
        print(f"Attempting authentication with: {username}")
        UserModel = get_user_model()
        try:
            # Try to fetch the user by username or email
            user = UserModel.objects.get(
                Q(username__iexact=username) | Q(email__iexact=username)
            )
            print(f"Found user: {user.username}, email: {user.email}")
            if user.check_password(password):
                print("Password check successful")
                return user
            else:
                print("Password check failed")
        except UserModel.DoesNotExist:
            print("User does not exist")
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a nonexistent user.
            UserModel().set_password(password)
        return None