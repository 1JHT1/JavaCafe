/**
 * Footer —— 页脚
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-brown-100 bg-cream-dark py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-xs text-brown-500 sm:flex-row sm:px-6">
        <p>JavaCafe · AI 咖啡面试官 —— 以咖啡之名，磨砺面试技艺</p>
        <p>
          Powered by <span className="font-medium text-brown-700">Spring Boot + LangChain4j + SSE</span>
        </p>
      </div>
    </footer>
  );
}
