import { useMemo, useState, useRef, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  Sun,
  Moon,
  User,
  Search,
  ChevronDown,
  Zap,
  PlayCircle,
  LayoutGrid,
  CreditCard,
  Users,
  Briefcase,
  Building2,
  BookOpen,
  HelpCircle,
  Info,
  FileText,
  Smile,
  Sparkles,
  Phone,
  ShieldCheck,
  Calendar,
  Bell,
  Settings,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/contexts/AuthContext";
import { useTheme } from "@/components/contexts/ThemeContext";
import { useColorScheme } from "@mui/material/styles";
import { ArrowRight } from "lucide-react";

const navConfig = {
  product: {
    label: "Product",
    items: [
      { title: "Features", description: "Explore the core features of GoLocal.", href: "/#features", icon: Zap },
      { title: "How it Works", description: "Learn how GoLocal connects you with local experts.", href: "/#how-it-works", icon: PlayCircle },
      { title: "Categories", description: "Browse all available service categories.", href: "/#services", icon: LayoutGrid },
      { title: "Pricing", description: "View our flexible plans for all users.", href: "/pricing", icon: CreditCard },
    ]
  },
  solutions: {
    label: "Solutions",
    items: [
      { title: "For Customers", description: "Find the best local services easily.", href: "/solutions/customers", icon: Users },
      { title: "For Providers", description: "Grow your service business with GoLocal.", href: "/solutions/providers", icon: Briefcase },
      { title: "For Businesses", description: "Enterprise solutions for your company.", href: "/solutions/businesses", icon: Building2 },
    ]
  },
  resources: {
    label: "Resources",
    items: [
      { title: "Blog", description: "Latest news and tips from our community.", href: "/resources/blog", icon: BookOpen },
      { title: "Help Center", description: "Get answers to your questions.", href: "/resources/help", icon: Info },
      { title: "FAQs", description: "Frequently asked questions.", href: "/resources/faqs", icon: HelpCircle },
      { title: "Guides", description: "In-depth guides on using GoLocal.", href: "/resources/guides", icon: FileText },
    ]
  },
  company: {
    label: "Company",
    items: [
      { title: "About Us", description: "Our mission and story.", href: "/company/about", icon: Smile },
      { title: "Careers", description: "Join our growing team.", href: "/company/careers", icon: Sparkles },
      { title: "Contact", description: "Reach out to us anytime.", href: "/company/contact", icon: Phone },
      { title: "Terms & Privacy", description: "Our legal documents.", href: "/company/legal", icon: ShieldCheck },
    ]
  }
};

const NavDropdown = ({ label, items, activeDropdown, setActiveDropdown, closeMenus }) => {
  const isOpen = activeDropdown === label;
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setActiveDropdown(label)}
      onMouseLeave={() => setActiveDropdown(null)}
    >
      <button 
        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors hover:text-primary ${isOpen ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <Motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-1/2 -translate-x-1/2 w-[380px] pt-4"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden p-3 grid gap-1">
              {items.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  onClick={closeMenus}
                  className="group flex items-start gap-4 p-3 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-0.5">{item.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationValue, setLocationValue] = useState("Mumbai, IN");
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setMode } = useColorScheme();

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    if (!isAuthenticated) {
      // Redirect to signin if not authenticated, passing the search query and intent
      navigate("/signin", { 
        state: { 
          from: "/providers", 
          searchQuery: searchQuery 
        } 
      });
    } else {
      // Redirect to providers with search query
      navigate(`/providers?search=${encodeURIComponent(searchQuery)}`);
      closeMenus();
    }
  };

  const handleToggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    toggleTheme();
    setMode(newTheme);
  };

  const dashboardPath = useMemo(() => {
    if (user?.role === "ADMIN") return "/admin-dashboard";
    if (user?.role === "PROVIDER") return "/provider-dashboard";
    return "/dashboard";
  }, [user?.role]);

  const bookingPagePath = useMemo(() => {
    if (user?.role === "PROVIDER") return "/provider/booking-management";
    return "/client/bookings";
  }, [user?.role]);

  const settingsPath = useMemo(() => {
    if (user?.role === "ADMIN") return "/admin/settings";
    if (user?.role === "PROVIDER") return "/provider/settings";
    return "/settings";
  }, [user?.role]);

  const closeMenus = () => {
    setIsOpen(false);
    setActiveDropdown(null);
  };

  const handleLogout = () => {
    closeMenus();
    logout();
  };

  return (
    <Motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 bg-card/85 backdrop-blur-lg border-b border-border"
    >
      <div className="container mx-auto px-4 h-18 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          to="/"
          onClick={() => { closeMenus(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="flex items-center gap-2.5 shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">GoLocal</span>
        </Link>

        {/* Desktop Main Nav */}
        <div className="hidden lg:flex items-center gap-1">
          <NavDropdown 
            label={navConfig.product.label} 
            items={navConfig.product.items} 
            activeDropdown={activeDropdown} 
            setActiveDropdown={setActiveDropdown}
            closeMenus={closeMenus}
          />
          <NavDropdown 
            label={navConfig.solutions.label} 
            items={navConfig.solutions.items} 
            activeDropdown={activeDropdown} 
            setActiveDropdown={setActiveDropdown}
            closeMenus={closeMenus}
          />
          <Link to="/pricing" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            Pricing
          </Link>
          <NavDropdown 
            label={navConfig.resources.label} 
            items={navConfig.resources.items} 
            activeDropdown={activeDropdown} 
            setActiveDropdown={setActiveDropdown}
            closeMenus={closeMenus}
          />
          <NavDropdown 
            label={navConfig.company.label} 
            items={navConfig.company.items} 
            activeDropdown={activeDropdown} 
            setActiveDropdown={setActiveDropdown}
            closeMenus={closeMenus}
          />
        </div>

        {/* Location & Search (Middle Desktop) */}
        <div className="hidden xl:flex items-center gap-2 flex-1 max-w-md mx-4">
          <form 
            onSubmit={handleSearch}
            className="relative flex-1 group"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search services..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/50 border border-transparent focus:border-primary/30 focus:bg-background h-10 pl-9 pr-12 rounded-xl text-sm transition-all outline-none"
            />
            <button 
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-muted/50 text-muted-foreground hover:bg-muted transition-colors cursor-pointer shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium truncate max-w-[100px]">{locationValue}</span>
          </div>
        </div>

        {/* Desktop Right Nav (Theme & Auth) */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={handleToggleTheme}
            className="p-2.5 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all group"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4.5 h-4.5" />
            ) : (
              <Moon className="w-4.5 h-4.5" />
            )}
          </button>

          <div className="h-6 w-px bg-border mx-1" />

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link to={dashboardPath}>
                <Button variant="ghost" size="sm" className="rounded-xl gap-2 font-medium">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
              <div 
                className="relative group"
                onMouseEnter={() => setActiveDropdown('user')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-all overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                
                <AnimatePresence>
                  {activeDropdown === 'user' && (
                    <Motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute top-full right-0 w-56 pt-4"
                    >
                      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden p-2 grid gap-1">
                        <div className="px-3 py-2 border-b border-border/50 mb-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-sm font-semibold truncate">{user?.name || 'User'}</p>
                            {user?.isVerified && (
                              <ShieldCheck size={14} className="text-emerald-500 fill-emerald-500/10" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                          {user?.isVerified && (
                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1 italic">Verified Profile</p>
                          )}
                        </div>
                        <Link to={dashboardPath} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors">
                          <LayoutDashboard className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <Link to={bookingPagePath} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors">
                          <Calendar className="w-4 h-4" />
                          My Bookings
                        </Link>
                        <Link to={settingsPath} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors">
                          <User className="w-4 h-4" />
                          Profile
                        </Link>
                        <button 
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors w-full text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </Motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <>
              <Button variant="ghost" asChild className="rounded-xl font-medium">
                <Link to="/signin">Sign In</Link>
              </Button>
              <Button asChild className="rounded-xl shadow-lg shadow-primary/20 font-medium">
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Nav Trigger */}
        <button
          className="lg:hidden p-2.5 rounded-xl bg-muted/50 text-foreground"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <Motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-card border-t border-border overflow-y-auto max-h-[calc(100vh-4.5rem)]"
          >
            <div className="container mx-auto px-6 py-8 flex flex-col gap-8">
              {/* Mobile Search/Location */}
              <div className="flex flex-col gap-3">
                <form 
                  onSubmit={handleSearch}
                  className="relative group"
                >
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search for providers..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-muted pl-12 pr-16 h-12 rounded-xl text-base outline-none border-2 border-transparent focus:border-primary/20"
                  />
                  <Button 
                    type="submit"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 rounded-lg px-3"
                  >
                    Search
                  </Button>
                </form>
                <div className="flex items-center gap-3 px-4 h-12 rounded-xl bg-muted text-muted-foreground">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{locationValue}</span>
                </div>
              </div>

              {/* Mobile Links */}
              <div className="grid gap-6">
                {[navConfig.product, navConfig.solutions, navConfig.resources, navConfig.company].map((section) => (
                  <div key={section.label}>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 px-1">{section.label}</h3>
                    <div className="grid gap-2">
                      {section.items.map((item) => (
                        <Link 
                          key={item.title} 
                          to={item.href} 
                          onClick={closeMenus}
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors active:scale-[0.98]"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <item.icon className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <Link 
                  to="/pricing" 
                  onClick={closeMenus}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">Pricing</span>
                </Link>
              </div>

              {/* Mobile Auth */}
              <div className="pt-6 border-t border-border flex flex-col gap-3">
                {isAuthenticated ? (
                  <>
                    <Link to={dashboardPath} onClick={closeMenus}>
                      <Button className="w-full h-12 rounded-xl gap-2 text-base">
                        <LayoutDashboard className="w-5 h-5" />
                        Go to Dashboard
                      </Button>
                    </Link>
                    <Link 
                      to="/projects" 
                      onClick={closeMenus}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium">My Bookings</span>
                    </Link>
                    <Link 
                      to="/settings" 
                      onClick={closeMenus}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium">Profile</span>
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="w-full h-12 rounded-xl flex items-center justify-center gap-2 border border-border text-red-500 font-medium mt-2"
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" asChild className="w-full h-12 rounded-xl text-base">
                      <Link to="/signin" onClick={closeMenus}>Sign In</Link>
                    </Button>
                    <Button asChild className="w-full h-12 rounded-xl text-base">
                      <Link to="/signup" onClick={closeMenus}>Get Started</Link>
                    </Button>
                  </>
                )}
                
                <button
                  onClick={handleToggleTheme}
                  className="w-full h-12 rounded-xl flex items-center justify-between px-4 bg-muted hover:bg-muted/80 transition-colors"
                >
                   <span className="font-medium">Appearance</span>
                   {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.nav>
  );
}
