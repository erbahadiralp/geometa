using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace GeoMeta.Api.Hubs;

[Authorize]
public class GeoMetaHub : Hub
{
    public async Task JoinSession(string username)
    {
        await Clients.Others.SendAsync("UserJoined", username);
    }

    public override async Task OnConnectedAsync()
    {
        var username = Context.User?.Identity?.Name ?? "unknown";
        await Clients.Others.SendAsync("UserJoined", username);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var username = Context.User?.Identity?.Name ?? "unknown";
        await Clients.Others.SendAsync("UserLeft", username);
        await base.OnDisconnectedAsync(exception);
    }
}
