using System;
using System.Windows;

namespace Vortex
{
    public partial class LoginWindow : Window
    {
        // Backend-in ünvanı. Server local işlədiyi üçün default localhost.
        private const string BackendBaseUrl = "http://localhost:4321";

        public LoginWindow()
        {
            InitializeComponent();
            Loaded += LoginWindow_Loaded;
        }

        private async void LoginWindow_Loaded(object sender, RoutedEventArgs e)
        {
            await LoginWebView.EnsureCoreWebView2Async();
            LoginWebView.CoreWebView2.WebMessageReceived += (s, args) =>
            {
                // server.js /auth/google/callback səhifəsi login_success mesajını göndərir.
                var json = args.WebMessageAsJson;
                if (json != null && json.Contains("login_success"))
                {
                    Dispatcher.Invoke(() =>
                    {
                        var main = new MainWindow();
                        main.Show();
                        this.Close();
                    });
                }
            };

            LoginWebView.CoreWebView2.Navigate($"{BackendBaseUrl}/auth/google/start");
        }

        // Test/development üçün: Google OAuth konfiqurasiya olunmayıbsa,
        // bu düymə ilə login-i keçib birbaşa proqrama daxil olmaq mümkündür.
        private void SkipLogin_Click(object sender, RoutedEventArgs e)
        {
            var main = new MainWindow();
            main.Show();
            this.Close();
        }
    }
}
