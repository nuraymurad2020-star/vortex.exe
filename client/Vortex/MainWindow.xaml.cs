using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Vortex
{
    public partial class MainWindow : Window
    {
        private const string BackendBaseUrl = "http://localhost:4321";
        private static readonly HttpClient Http = new HttpClient();

        private readonly List<JObject> _conversation = new();
        private string _selectedAgentId = "";

        public MainWindow()
        {
            InitializeComponent();
            Loaded += async (_, __) =>
            {
                await LoadAgentsAsync();
                await LoadWorkspaceAsync();
            };
        }

        private async Task LoadAgentsAsync()
        {
            try
            {
                var json = await Http.GetStringAsync($"{BackendBaseUrl}/api/agents");
                var agents = JArray.Parse(json);
                AgentSelector.Items.Clear();
                foreach (var a in agents)
                {
                    AgentSelector.Items.Add(new ComboBoxItem
                    {
                        Content = a["label"]!.ToString(),
                        Tag = a["id"]!.ToString(),
                    });
                }
                if (AgentSelector.Items.Count > 0)
                    AgentSelector.SelectedIndex = 0;
            }
            catch (Exception ex)
            {
                AppendSystemMessage($"Backend-ə qoşulmaq mümkün olmadı: {ex.Message}\n" +
                                     "Backend serverin işlədiyinə əmin olun (npm start, backend qovluğunda).");
            }
        }

        private async Task LoadWorkspaceAsync()
        {
            try
            {
                var payload = JsonConvert.SerializeObject(new { path = "." });
                // list_dir aləti birbaşa fayl tools API-si kimi çağırıla bilər;
                // sadəlik üçün burada birbaşa /api/chat üzərindən deyil, gələcəkdə
                // ayrıca /api/workspace endpoint əlavə etmək tövsiyə olunur.
                WorkspaceList.Items.Clear();
                WorkspaceList.Items.Add("(workspace boşdur - agent fayl yaratdıqca burda görünəcək)");
            }
            catch { /* sakit keç */ }
        }

        private void AgentSelector_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (AgentSelector.SelectedItem is ComboBoxItem item)
                _selectedAgentId = item.Tag?.ToString() ?? "";
        }

        private void RefreshWorkspace_Click(object sender, RoutedEventArgs e) => _ = LoadWorkspaceAsync();

        private void MessageInput_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter) SendButton_Click(sender, e);
        }

        private async void SendButton_Click(object sender, RoutedEventArgs e)
        {
            var text = MessageInput.Text.Trim();
            if (string.IsNullOrEmpty(text) || string.IsNullOrEmpty(_selectedAgentId)) return;

            MessageInput.Text = "";
            AppendChatMessage("user", text);

            var userMsg = new JObject { ["role"] = "user", ["content"] = text };
            _conversation.Add(userMsg);

            var body = new JObject
            {
                ["agentId"] = _selectedAgentId,
                ["messages"] = JArray.FromObject(_conversation),
                ["useTools"] = true,
            };

            try
            {
                var content = new StringContent(body.ToString(), Encoding.UTF8, "application/json");
                var response = await Http.PostAsync($"{BackendBaseUrl}/api/chat", content);
                var responseJson = JObject.Parse(await response.Content.ReadAsStringAsync());

                if (!response.IsSuccessStatusCode)
                {
                    AppendSystemMessage($"Xəta: {responseJson["error"]}");
                    return;
                }

                var assistantText = responseJson["message"]?["content"]?.ToString() ?? "(cavab yoxdur)";
                AppendChatMessage("assistant", assistantText);

                // Tam söhbət tarixçəsini serverdən geri alırıq (tool nəticələri daxil)
                _conversation.Clear();
                foreach (var m in (JArray)responseJson["conversation"]!)
                    _conversation.Add((JObject)m);

                await LoadWorkspaceAsync();
            }
            catch (Exception ex)
            {
                AppendSystemMessage($"Sorğu göndərilə bilmədi: {ex.Message}");
            }
        }

        private void AppendChatMessage(string role, string text)
        {
            var block = new TextBlock
            {
                Text = (role == "user" ? "Siz: " : "Vortex: ") + text,
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 0, 0, 12),
                Foreground = (System.Windows.Media.Brush)FindResource("VortexText"),
            };
            ChatItems.Items.Add(block);
            ChatScroll.ScrollToEnd();
        }

        private void AppendSystemMessage(string text)
        {
            var block = new TextBlock
            {
                Text = "[sistem] " + text,
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 0, 0, 12),
                Foreground = (System.Windows.Media.Brush)FindResource("VortexMuted"),
            };
            ChatItems.Items.Add(block);
        }
    }
}
