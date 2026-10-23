import AdminAuthGuard from './components/AdminAuthGuard';

export const metadata = {
  title: 'Admin Suite | Sri Gokulam Veg Restaurant',
  description: 'Enterprise POS & Kitchen Management Suite for Sri Gokulam Pure Vegetarian Restaurant, Karaikudi.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }) {
  return <AdminAuthGuard>{children}</AdminAuthGuard>;
}
