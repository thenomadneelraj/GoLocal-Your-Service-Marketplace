import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

const ProviderIntegrationTest = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const tests = [
    {
      name: 'Dashboard Data',
      endpoint: '/provider/dashboard',
      method: 'GET',
      description: 'Test provider dashboard data loading'
    },
    {
      name: 'Services List',
      endpoint: '/services',
      method: 'GET',
      description: 'Test loading provider services'
    },
    {
      name: 'Bookings List',
      endpoint: '/bookings',
      method: 'GET',
      description: 'Test loading provider bookings'
    },
    {
      name: 'Transactions List',
      endpoint: '/transactions',
      method: 'GET',
      description: 'Test loading provider earnings/transactions'
    },
    {
      name: 'Profile Data',
      endpoint: '/profile',
      method: 'GET',
      description: 'Test loading provider profile'
    },
    {
      name: 'Conversations',
      endpoint: '/conversations',
      method: 'GET',
      description: 'Test loading provider conversations'
    },
    {
      name: 'Notifications',
      endpoint: '/notifications',
      method: 'GET',
      description: 'Test loading provider notifications'
    }
  ];

  const runTest = async (test) => {
    try {
      const response = await api[`${test.method.toLowerCase()}`](test.endpoint);
      return {
        success: true,
        data: response.data,
        message: `Success: ${response.data ? 'Data received' : 'No data'}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: `Error: ${error.response?.data?.message || error.message}`
      };
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setTestResults({});
    
    const results = {};
    
    for (const test of tests) {
      const result = await runTest(test);
      results[test.name] = result;
      
      // Update results immediately for better UX
      setTestResults(prev => ({
        ...prev,
        [test.name]: result
      }));
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setLoading(false);
    
    // Show summary
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    if (successCount === totalCount) {
      toast.success(`All ${totalCount} tests passed! 🎉`);
    } else {
      toast.error(`${totalCount - successCount} tests failed`);
    }
  };

  const runSingleTest = async (test) => {
    setTestResults(prev => ({
      ...prev,
      [test.name]: { loading: true }
    }));
    
    const result = await runTest(test);
    
    setTestResults(prev => ({
      ...prev,
      [test.name]: result
    }));
    
    if (result.success) {
      toast.success(`${test.name} test passed`);
    } else {
      toast.error(`${test.name} test failed`);
    }
  };

  const TestStatusIcon = ({ result }) => {
    if (result.loading) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
    
    if (result.success) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Integration Test</h1>
            <p className="text-muted-foreground mt-1 max-w-md text-sm font-medium leading-relaxed">
              Test all provider API endpoints to ensure proper integration with the backend.
            </p>
          </div>
          <Button
            onClick={runAllTests}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Run All Tests
          </Button>
        </div>

        {/* User Info */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-lg font-semibold mb-4">Current User</h2>
          <div className="grid gap-2 text-sm">
            <div><strong>Name:</strong> {user?.name || 'N/A'}</div>
            <div><strong>Email:</strong> {user?.email || 'N/A'}</div>
            <div><strong>Role:</strong> {user?.role || 'N/A'}</div>
            <div><strong>Status:</strong> {user?.approvalStatus || 'N/A'}</div>
            <div><strong>Verified:</strong> {user?.isVerified ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">API Endpoint Tests</h2>
          </div>
          
          <div className="divide-y divide-border">
            {tests.map((test) => {
              const result = testResults[test.name];
              
              return (
                <div key={test.name} className="p-6 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <TestStatusIcon result={result || {}} />
                        <h3 className="font-semibold text-foreground">{test.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{test.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono bg-muted px-2 py-1 rounded">
                          {test.method} {test.endpoint}
                        </span>
                      </div>
                      
                      {result && !result.loading && (
                        <div className={`mt-3 p-3 rounded-lg text-sm ${
                          result.success 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {result.message}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runSingleTest(test)}
                      disabled={result?.loading}
                      className="shrink-0"
                    >
                      Test
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        {Object.keys(testResults).length > 0 && (
          <div className="bg-card rounded-lg p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4">Test Summary</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(testResults).filter(r => r.success).length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {Object.values(testResults).filter(r => !r.success && !r.loading).length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.values(testResults).filter(r => r.loading).length}
                </div>
                <div className="text-sm text-muted-foreground">Running</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProviderIntegrationTest;
