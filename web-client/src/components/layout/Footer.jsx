import { Phone, Envelope } from "@phosphor-icons/react";
import { socials } from "@/components/icons/SocialIcons";
import { CHATBOT_PREFILL_EVENT } from "@/components/chatbot/ChatbotWidget";
import fscapeLogoFull from "../../assets/fscape-logo-full.svg";

const ABOUT_LINKS = [
  { label: "Giới thiệu", prompt: "Hãy giới thiệu ngắn gọn về FScape cho tôi." },
  { label: "Đội ngũ", prompt: "Cho tôi biết thêm về đội ngũ FScape." },
  { label: "Tuyển dụng", prompt: "FScape hiện có thông tin tuyển dụng hoặc cơ hội hợp tác nào không?" },
  { label: "Đối tác đại học", prompt: "FScape hiện đang hợp tác với những trường đại học nào?" },
  { label: "Tìm phòng", prompt: "Hướng dẫn tôi cách tìm phòng phù hợp trên FScape." },
];

const SUPPORT_LINKS = [
  { label: "Câu hỏi thường gặp", prompt: "Cho tôi xem các câu hỏi thường gặp khi đặt phòng trên FScape." },
  { label: "Hướng dẫn đặt phòng", prompt: "Hướng dẫn tôi quy trình đặt phòng trên FScape." },
  { label: "Chính sách hoàn tiền", prompt: "Cho tôi biết chính sách hoàn tiền và hủy đặt phòng của FScape." },
  { label: "Ưu đãi hiện tại", prompt: "Hiện tại FScape có ưu đãi hoặc chương trình nào không?" },
];

const LEGAL_LINKS = [
  { label: "Điều khoản sử dụng", prompt: "Cho tôi biết các điều khoản sử dụng chính của FScape." },
  { label: "Chính sách bảo mật", prompt: "Cho tôi biết chính sách bảo mật của FScape." },
  { label: "Cookie", prompt: "FScape sử dụng cookie như thế nào?" },
];

export default function Footer() {
  const openChatbotWithPrompt = (prompt) => {
    window.dispatchEvent(
      new CustomEvent(CHATBOT_PREFILL_EVENT, {
        detail: { prompt },
      })
    );
  };

  return (
    <footer className="bg-primary text-white">
      {/* Top section — Brand + links + socials */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-14 md:pt-20 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand + socials */}
          <div className="lg:col-span-2">
            <a href="/" className="flex items-center gap-2.5 mb-6">
              <img src={fscapeLogoFull} alt="FScape" className="h-[60px]" />
            </a>

            <p className="text-sm font-semibold text-white/80 mb-3">
              Theo dõi chúng tôi
            </p>
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 text-white/60 hover:bg-olive hover:border-olive hover:text-primary transition-colors"
                >
                  <s.icon className="w-4.5 h-4.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div>
            <p className="inline-block text-sm font-bold uppercase tracking-wider text-primary bg-olive px-2 py-0.5 mb-4">
              Về FScape
            </p>
            <ul className="flex flex-col gap-2.5">
              {ABOUT_LINKS.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => openChatbotWithPrompt(item.prompt)}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="inline-block text-sm font-bold uppercase tracking-wider text-primary bg-olive px-2 py-0.5 mb-4">
              Hỗ trợ
            </p>
            <ul className="flex flex-col gap-2.5">
              {SUPPORT_LINKS.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => openChatbotWithPrompt(item.prompt)}
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="inline-block text-sm font-bold uppercase tracking-wider text-primary bg-olive px-2 py-0.5 mb-4">
              Liên hệ
            </p>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a href="tel:+84852325683" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                  <Phone className="w-3.5 h-3.5 text-olive shrink-0" />
                  +84 852 325 683
                </a>
              </li>
              <li>
                <a href="mailto:hminh250104@gmail.com" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                  <Envelope className="w-3.5 h-3.5 text-olive shrink-0" />
                  hminh250104@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">
            © 2026 FScape. Mọi quyền được bảo lưu.
          </p>
          <div className="flex gap-6 text-xs text-white/30">
            {LEGAL_LINKS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => openChatbotWithPrompt(item.prompt)}
                className="hover:text-white/60 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
