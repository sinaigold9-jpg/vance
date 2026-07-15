import { useState } from 'react'
import './App.css'

type NavItem = {
  id: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { id: 'home', label: 'الرئيسية', icon: '🏠' },
  { id: 'search', label: 'البحث', icon: '🔍' },
  { id: 'favorites', label: 'المفضلة', icon: '⭐' },
  { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
  { id: 'profile', label: 'الملف الشخصي', icon: '👤' },
]

function App() {
  const [active, setActive] = useState('home')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  const handleShare = async () => {
    const shareData = {
      title: 'تطبيقي',
      text: 'جرّب تطبيقي الرائع!',
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // user cancelled — no action needed
      }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareData.url)
        showToast('تم نسخ رابط التطبيق إلى الحافظة')
      } catch {
        showToast('تعذّر نسخ الرابط')
      }
    } else {
      showToast('مشاركة الرابط غير مدعومة على هذا الجهاز')
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo">✦</span>
          <h1 className="brand">تطبيقي</h1>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => setActive(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}

          <div className="nav-divider" />

          <button className="nav-item share-item" onClick={handleShare}>
            <span className="nav-icon">📤</span>
            <span className="nav-label">مشاركة التطبيق</span>
          </button>
        </nav>
      </aside>

      <main className="content">
        <h2>مرحبًا بك في {navItems.find((n) => n.id === active)?.label}</h2>
        <p>هذه صفحة تجريبية تحتوي على قائمة جانبية مع زر مشاركة التطبيق.</p>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
