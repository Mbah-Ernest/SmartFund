import { api } from '../../../api/axios';
import { toApiClientError } from '../../../api/apiError';

export interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolTrace {
  toolName: string;
  inputJson: string;
  outputJson: string;
  durationMs: number;
}

export interface PendingActionSummary {
  pendingActionId: string;
  summary: string;
  expiresInSeconds: number;
}

export interface AgentChatResponse {
  reply: string;
  toolTraces: ToolTrace[];
  pendingAction: PendingActionSummary | null;
}

export async function sendChatMessage(messages: ChatMessageDto[]): Promise<AgentChatResponse> {
  try {
    const { data } = await api.post<AgentChatResponse>('/agent/chat', { messages });
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function confirmAction(pendingActionId: string): Promise<{ message: string }> {
  try {
    const { data } = await api.post<{ message: string }>(`/agent/confirm-action/${pendingActionId}`);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function cancelAction(pendingActionId: string): Promise<void> {
  try {
    await api.delete(`/agent/pending-actions/${pendingActionId}`);
  } catch (error) {
    throw toApiClientError(error);
  }
}
