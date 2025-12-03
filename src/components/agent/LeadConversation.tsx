import React from "react";
import { ZapMessage, SenderType } from "@/services/zapCorretor";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Bot, User, MessageSquare } from "lucide-react";

interface LeadConversationProps {
  messages: ZapMessage[];
}

const getSenderIcon = (senderType: SenderType) => {
  switch (senderType) {
    case 'ai':
      return <Bot className="w-4 h-4 text-blue-500" />;
    case 'agent':
      return <User className="w-4 h-4 text-green-600" />;
    case 'lead':
    default:
      return <MessageSquare className="w-4 h-4 text-gray-500" />;
  }
};

const LeadConversation: React.FC<LeadConversationProps> = ({ messages }) => {
  if (messages.length === 0) {
    return <p className="text-gray-500 text-center py-4">Nenhuma mensagem registrada nesta conversa.</p>;
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto p-2">
      {messages.map((msg) => {
        const isLead = msg.sender_type === 'lead';
        const isAgent = msg.sender_type === 'agent';
        const isAi = msg.sender_type === 'ai';

        return (
          <div
            key={msg.id}
            className={cn(
              "flex",
              isLead ? "justify-start" : "justify-end"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] p-3 rounded-lg shadow-md",
                isLead
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none"
                  : isAgent
                  ? "bg-green-100 dark:bg-green-900 text-gray-900 dark:text-gray-100 rounded-tr-none"
                  : "bg-blue-100 dark:bg-blue-900 text-gray-900 dark:text-gray-100 rounded-tr-none"
              )}
            >
              <div className="flex items-center justify-between mb-1 text-xs font-semibold">
                <span className="capitalize flex items-center gap-1">
                  {getSenderIcon(msg.sender_type)}
                  {msg.sender_type === 'lead' ? 'Lead' : msg.sender_type === 'agent' ? 'Corretor' : 'IA'}
                </span>
                <span className="text-xs text-muted-foreground ml-4">
                  {format(new Date(msg.created_at), 'HH:mm - dd/MM')}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LeadConversation;