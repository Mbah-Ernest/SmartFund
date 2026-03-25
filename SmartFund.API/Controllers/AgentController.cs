using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Services;
using SmartFund.Application.Services.Agent;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/agent")]
    public sealed class AgentController : ControllerBase
    {
        private readonly AgentChatService _chat;
        private readonly AgentActionService _action;

        public AgentController(AgentChatService chat, AgentActionService action)
        {
            _chat = chat;
            _action = action;
        }

        private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? "default";

        // POST /api/agent/chat
        [HttpPost("chat")]
        public async Task<IActionResult> Chat(
            [FromBody] ChatRequest request,
            CancellationToken ct)
        {
            var history = request.Messages
                .Select(m => new ChatTurn(m.Role, m.Content))
                .ToList();

            var response = await _chat.ChatAsync(UserId, history, ct);

            return Ok(new
            {
                reply = response.Reply,
                toolTraces = response.ToolTraces,
                pendingAction = response.PendingAction
            });
        }

        // POST /api/agent/confirm-action/{id}
        [HttpPost("confirm-action/{id:guid}")]
        public async Task<IActionResult> ConfirmAction(Guid id, CancellationToken ct)
        {
            var result = await _action.ConfirmActionAsync(UserId, id, ct);
            return Ok(new { message = result });
        }

        // DELETE /api/agent/pending-actions/{id}
        [HttpDelete("pending-actions/{id:guid}")]
        public async Task<IActionResult> CancelAction(Guid id, CancellationToken ct)
        {
            await _action.CancelActionAsync(UserId, id, ct);
            return Ok(new { message = "Action cancelled." });
        }
    }

    public sealed class ChatRequest
    {
        public List<ChatMessageDto> Messages { get; set; } = new();
    }

    public sealed class ChatMessageDto
    {
        public string Role { get; set; } = "user";
        public string Content { get; set; } = "";
    }
}
