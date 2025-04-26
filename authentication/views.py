from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib import messages
from django.views.generic import View
from django.contrib.auth.views import LoginView, LogoutView
from django.urls import reverse_lazy

from .forms import UserRegistrationForm, UserLoginForm

class RegisterView(View):
    template_name = 'authentication/register.html'
    
    def get(self, request):
        form = UserRegistrationForm()
        return render(request, self.template_name, {'form': form})
        
    def post(self, request):
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Registration successful!')
            return redirect('home:home')  # Updated with namespace
        return render(request, self.template_name, {'form': form})

class CustomLoginView(LoginView):
    template_name = 'authentication/login.html'
    form_class = UserLoginForm
    redirect_authenticated_user = True
    
    def form_valid(self, form):
        remember_me = self.request.POST.get('remember_me')
        if not remember_me:
            # Session expires when the user closes their browser
            self.request.session.set_expiry(0)
        else:
            # Session expires after 30 days
            self.request.session.set_expiry(60 * 60 * 24 * 30)
            
        messages.success(self.request, f'Welcome back, {form.get_user().username}!')
        return super().form_valid(form)
    
    def form_invalid(self, form):
        messages.error(self.request, 'Login failed. Please check your email/username and password.')
        return super().form_invalid(form)
        
    def get_success_url(self):
        return reverse_lazy('home:home')

class CustomLogoutView(LogoutView):
    next_page = reverse_lazy('home:home')
    http_method_names = ['get', 'post']  # Allow GET requests
    
    def dispatch(self, request, *args, **kwargs):
        messages.success(request, 'You have been logged out successfully!')
        return super().dispatch(request, *args, **kwargs)