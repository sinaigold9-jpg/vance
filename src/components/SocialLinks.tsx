import { motion } from "framer-motion";
import { ExternalLink, Bot } from "lucide-react";

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const BotIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

export const SocialLinks = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-card rounded-2xl shadow-card border border-border/50 p-6"
    >
      <h3 className="text-lg font-bold text-foreground mb-4 text-center">تابعنا على</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Facebook */}
        <a
          href="https://www.facebook.com/share/19wP4kBU7h/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 p-4 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/30 hover:bg-[#1877F2]/20 transition-all group"
        >
          <div className="text-[#1877F2]">
            <FacebookIcon />
          </div>
          <span className="font-bold text-[#1877F2]">فيسبوك</span>
          <ExternalLink className="w-4 h-4 text-[#1877F2] opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>

        {/* Telegram Channel */}
        <a
          href="https://t.me/+coQ6wvAp-_IwNjFk"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 p-4 rounded-xl bg-[#0088CC]/10 border border-[#0088CC]/30 hover:bg-[#0088CC]/20 transition-all group"
        >
          <div className="text-[#0088CC]">
            <TelegramIcon />
          </div>
          <span className="font-bold text-[#0088CC]">تليجرام</span>
          <ExternalLink className="w-4 h-4 text-[#0088CC] opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>

        {/* Telegram Bot - Support */}
        <a
          href="http://t.me/Advance0bot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 p-4 rounded-xl bg-[#9333EA]/10 border border-[#9333EA]/30 hover:bg-[#9333EA]/20 transition-all group"
        >
          <div className="text-[#9333EA]">
            <Bot className="w-6 h-6" />
          </div>
          <span className="font-bold text-[#9333EA]">دعم تليجرام</span>
          <ExternalLink className="w-4 h-4 text-[#9333EA] opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>

      </div>
    </motion.div>
  );
};