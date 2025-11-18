'use client';
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Paper,
  Tooltip,
  IconButton,
  Badge,
  Chip,
  Button,
  Avatar,
} from "@mui/material";
import {
  Home,
  Map,
  BarChart,
  Settings,
  Users,
  Shield,
  FileText,
  LogOut,
  Building,
  Search,
  AlertTriangle,
  TrendingUp,
  Globe,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "../sidebar/hooks";
import Logo from '@/components/ui/Logo';
import { cn } from "@/lib/utils";

// Sidebar items based on roles
const getSidebarItems = (userRole: string) => {
  const commonItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home, permission: "view_dashboard" },
    { title: "Mining Analysis", url: "/dashboard/analysis", icon: Map, permission: "mining_analysis" },
    { title: "Compliance Reports", url: "/dashboard/compliance", icon: FileText, permission: "compliance_reports" },
  ];

  const roleBasedItems = {
    super_admin: [
      { title: "National Overview", url: "/dashboard/national", icon: Globe, permission: "system_config" },
      { title: "User Management", url: "/dashboard/users", icon: Users, permission: "user_management" },
      { title: "System Analytics", url: "/dashboard/analytics", icon: BarChart, permission: "system_analytics" },
    ],
    state_admin: [
      { title: "State Overview", url: "/dashboard/state", icon: Building, permission: "view_analytics" },
      { title: "District Management", url: "/dashboard/districts", icon: Users, permission: "user_management" },
    ],
    district_analyst: [
      { title: "My Analyses", url: "/dashboard/my-analyses", icon: TrendingUp, permission: "mining_analysis" },
      { title: "Violations", url: "/dashboard/violations", icon: AlertTriangle, permission: "compliance_reports" },
    ],
    reviewing_officer: [
      { title: "Pending Reviews", url: "/dashboard/reviews", icon: Shield, permission: "reports_approval" },
      { title: "Audit Logs", url: "/dashboard/audit", icon: FileText, permission: "audit_logs" },
    ],
    GEO_ANALYST: [
      { title: "Geo-Analyst Dashboard", url: "/geoanalyst-dashboard", icon: Map, permission: "geo_analysis" },
      { title: "My AOI Projects", url: "/dashboard/my-aoi", icon: Globe, permission: "create_aoi" },
      { title: "Analysis History", url: "/dashboard/analysis-history", icon: BarChart, permission: "view_analysis_results" },
      { title: "Satellite Imagery", url: "/dashboard/imagery", icon: Search, permission: "geo_analysis" },
    ],
  };

  return [
    ...commonItems,
    ...(roleBasedItems[userRole as keyof typeof roleBasedItems] || [])
  ];
};

// Group items for better organization
const groupSidebarItems = (items: any[]) => {
  const mainGroup = items.filter(item => 
    ['Dashboard', 'Mining Analysis', 'Compliance Reports'].includes(item.title)
  );
  
  const managementGroup = items.filter(item => 
    ['User Management', 'District Management', 'My Analyses', 'Pending Reviews'].includes(item.title)
  );
  
  const analyticsGroup = items.filter(item => 
    ['National Overview', 'State Overview', 'System Analytics', 'Audit Logs'].includes(item.title)
  );

  return { mainGroup, managementGroup, analyticsGroup };
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open, isMobile, openMobile, setOpenMobile } = useSidebar();
  const { user, logout, hasPermission } = useAuth();
  
  const isExpanded = open || openMobile;
  const userRole = user?.primaryRole || 'district_analyst';
  
  // Get filtered items based on permissions
  const sidebarItems = getSidebarItems(userRole).filter(item => 
    hasPermission(item.permission.split('_')[0], item.permission.split('_')[1])
  );
  
  const { mainGroup, managementGroup, analyticsGroup } = groupSidebarItems(sidebarItems);

  const handleLinkClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const renderNavItem = (item: any) => {
    const isActive = pathname === item.url;
    
    return (
      <Tooltip key={item.title} title={isExpanded ? "" : item.title} placement="right">
        <Link
          href={item.url}
          onClick={handleLinkClick}
          className={cn(
            "flex items-center p-3 rounded-lg transition-all duration-200 mx-2 mb-1",
            isActive
              ? "border"
              : "border border-transparent"
          )}
          style={isActive ? {
            backgroundColor: 'rgba(251, 191, 36, 0.15)',
            borderColor: 'rgba(251, 191, 36, 0.5)',
            color: '#fcd34d'
          } : {
            color: '#ffffff'
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.1)';
              e.currentTarget.style.color = '#fcd34d';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#ffffff';
            }
          }}
        >
          <item.icon 
            className="w-5 h-5" 
            style={{ color: isActive ? '#fbbf24' : '#fcd34d' }}
          />
          {isExpanded && (
            <span className="ml-3 text-sm font-medium truncate">{item.title}</span>
          )}
        </Link>
      </Tooltip>
    );
  };

  const renderGroup = (items: any[], title?: string) => (
    <Box sx={{ mb: 2 }}>
      {title && isExpanded && (
        <Box sx={{ px: 2, py: 1 }}>
          <Chip 
            label={title} 
            size="small" 
            variant="outlined"
            sx={{ 
              fontSize: '0.7rem', 
              fontWeight: 600,
              color: '#fcd34d',
              borderColor: 'rgba(252, 211, 77, 0.5)',
              backgroundColor: 'rgba(251, 191, 36, 0.1)'
            }}
          />
        </Box>
      )}
      {items.map(renderNavItem)}
    </Box>
  );

  return (
    <>
      {isMobile && openMobile && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setOpenMobile(false)}
        />
      )}

      <Paper
        elevation={2}
        className={cn(
          "flex flex-col border-r",
          "fixed md:relative z-40 h-screen",
          isMobile
            ? openMobile
              ? "w-[280px]"
              : "w-0"
            : open
            ? "w-[280px]"
            : "w-[80px]",
          "transition-all duration-300 ease-in-out"
        )}
        sx={{
          background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
          borderRight: '1px solid rgba(251, 191, 36, 0.2)'
        }}
        square
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <Box sx={{ 
            p: 2, 
            borderBottom: '1px solid rgba(251, 191, 36, 0.2)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: isExpanded ? 'space-between' : 'center' }}>
              {isExpanded ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Logo size={32} withCircle={true} />
                    <Box>
                      <div className="font-bold text-sm" style={{ 
                        background: 'linear-gradient(to right, #fbbf24, #fcd34d, #fbbf24)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 2px 4px rgba(251, 191, 36, 0.3))'
                      }}>
                        KhananNetra
                      </div>
                      <div className="text-xs" style={{ color: 'rgba(252, 211, 77, 0.7)' }}>
                        Government Portal
                      </div>
                    </Box>
                  </Box>
                  <Badge 
                    color="primary" 
                    variant="dot"
                    sx={{ 
                      '& .MuiBadge-dot': { 
                        backgroundColor: user?.isActive ? '#fbbf24' : '#fcd34d'
                      } 
                    }}
                  >
                    <Avatar sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: '#fbbf24',
                      color: '#1a1a2e',
                      border: '2px solid rgba(251, 191, 36, 0.5)'
                    }}>
                      {user?.name?.charAt(0) || 'U'}
                    </Avatar>
                  </Badge>
                </>
              ) : (
                <Tooltip title="KhananNetra" placement="right">
                  <Box>
                    <Logo size={32} withCircle={true} />
                  </Box>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            {renderGroup(mainGroup)}
            {managementGroup.length > 0 && renderGroup(managementGroup, isExpanded ? "Management" : undefined)}
            {analyticsGroup.length > 0 && renderGroup(analyticsGroup, isExpanded ? "Analytics" : undefined)}
            
            {/* Settings - Always at bottom */}
            {renderGroup([
              { title: "Settings", url: "/dashboard/settings", icon: Settings, permission: "system_config" }
            ])}
          </div>

          {/* Footer */}
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid rgba(251, 191, 36, 0.2)' 
          }}>
            {isExpanded ? (
              <Button
                fullWidth
                startIcon={<LogOut size={16} />}
                onClick={logout}
                variant="outlined"
                size="small"
                sx={{ 
                  justifyContent: 'flex-start',
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  color: '#fcd34d',
                  borderColor: 'rgba(252, 211, 77, 0.5)',
                  '&:hover': {
                    borderColor: '#fbbf24',
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    color: '#fbbf24'
                  }
                }}
              >
                Logout • {user?.name}
              </Button>
            ) : (
              <Tooltip title="Logout" placement="right">
                <IconButton 
                  onClick={logout} 
                  size="small"
                  sx={{
                    color: '#fcd34d',
                    '&:hover': {
                      color: '#fbbf24',
                      backgroundColor: 'rgba(251, 191, 36, 0.1)'
                    }
                  }}
                >
                  <LogOut size={16} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </div>
      </Paper>
    </>
  );
}