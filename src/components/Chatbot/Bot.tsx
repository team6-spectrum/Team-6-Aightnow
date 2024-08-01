import ChatBotIcon from "@/icons/ChatBotIcon";

interface BotProps {
  children: React.ReactNode;
}

const Bot: React.FC<BotProps> = ({ children }) => {
  return (
    <div className="flex items-start gap-4 mb-4">
      <div className="flex items-center justify-center">
        <div className="relative">
          <ChatBotIcon />
        </div>
      </div>
      <div className="p-2 bg-gray-200 rounded-lg max-w-xs">
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
};

export default Bot;
