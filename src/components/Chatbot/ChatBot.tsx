import React, { useState, useEffect, useRef } from "react";
import useChatStore from "@/stores/useChatStore";
import IconButton from "../Button/IconButton";
import Input from "../Input";
import Bot from "./Bot";
import User from "./User";
import { LocaleTypes } from "@/utils/localization/settings";
import { useTranslation } from "@/utils/localization/client";

interface ChatBotProps {
  onClose: () => void;
  lang: LocaleTypes;
}

const ChatBot: React.FC<ChatBotProps> = ({ onClose, lang }) => {
  const [message, setMessage] = useState("");
  const { t } = useTranslation(lang, "chatbot");
  const {
    chatHistory,
    isLoading,
    sendMessage,
    currentStock,
    stockData,
    fetchStockData,
    setLanguage,
  } = useChatStore();
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  useEffect(() => {
    if (currentStock) {
      fetchStockData();
    }
  }, [currentStock, fetchStockData]);

  useEffect(() => {
    setLanguage(lang);
  }, [lang, setLanguage]);

  function handleMessageChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMessage(e.target.value.slice(0, 100));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    
    const isStockCode = /^[A-Za-z0-9]{1,5}$/.test(trimmedMessage);
    
    if (isStockCode || trimmedMessage.length >= 2) {
      await sendMessage(trimmedMessage);
      setMessage("");
    } else {
      alert(t("invalidInputMessage"));
    }
  }

  return (
    <div className="fixed bottom-0 right-0 w-[480px] h-[640px] bg-white shadow-chatbot rounded-t-3xl overflow-hidden flex flex-col">
      <nav className="sticky top-0 z-10 bg-navy-900 w-full h-16 flex items-center justify-between px-6 border-b border-gray-200 rounded-tl-3xl">
        <span className="text-grayscale-100 text-2xl font-bold">
          {t("title")}
        </span>
        <IconButton
          icon="close"
          size="xsm"
          variant="primary"
          onClick={onClose}
        />
      </nav>

      <div className="flex-grow overflow-y-auto max-h-[488px] p-4">
        <div className="flex flex-col gap-3">
          {chatHistory.map((chat, index) =>
            chat.role === "user" ? (
              <User key={index} content={chat.content} />
            ) : (
              <Bot key={index}>
                <div>
                  {chat.content === "generatingResponse" ? (
                    <div className="animate-pulse">{t("generatingResponse")}</div>
                  ) : chat.content.startsWith("오류:") ? (
                    <div className="text-red-500">{chat.content}</div>
                  ) : (
                    <div>{t(chat.content, chat.translationParams)}</div>
                  )}
                  {chat.stockInfo && (
                    <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                      <h3 className="font-bold">
                        {t("stockInfo", { symbol: chat.stockInfo.symbol })}
                      </h3>
                      <div>
                        {t("currentPrice")}: ${chat.stockInfo.currentPrice}
                      </div>
                      <div
                        className={
                          chat.stockInfo.priceChange >= 0
                            ? "text-red-500"
                            : "text-blue-500"
                        }
                      >
                        {t("change")}: {chat.stockInfo.priceChange} (
                        {chat.stockInfo.percentChange}%)
                      </div>
                    </div>
                  )}
                </div>
              </Bot>
            )
          )}
          {isLoading &&
            !chatHistory[chatHistory.length - 1]?.content.includes(
              "generatingResponse"
            ) && (
              <Bot>
                <div className="animate-pulse">{t("generatingResponse")}</div>
              </Bot>
            )}
          <div ref={chatEndRef} />
        </div>
      </div>


      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 flex items-center gap-2 p-4 bg-white"
      >
        <div className="flex-grow">
          <Input
            type="text"
            placeholder={t("inputPlaceholder")}
            inputValue={message}
            setInputValue={handleMessageChange}
            iconPosition="right"
          />
        </div>
        <button
          type="submit"
          className="text-white bg-navy-900 text-base font-medium w-[63px] h-[63px] rounded-xl ml-2"
          disabled={isLoading}
        >
          {t("send")}
        </button>
      </form>
    </div>
  );
};

export default ChatBot;