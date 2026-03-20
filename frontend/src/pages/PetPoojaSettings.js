import { useState, useEffect } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, AlertCircle, Send, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PetPoojaSettings = () => {
  const [webhookUrls, setWebhookUrls] = useState(null);
  const [copied, setCopied] = useState({});
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testData, setTestData] = useState({
    bill_number: 'TEST-001',
    amount: '500',
    order_number: 'USB-20260307-006',
    payment_method: 'cash'
  });

  useEffect(() => {
    fetchWebhookUrls();
  }, []);

  const fetchWebhookUrls = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const response = await axios.get(`${API}/petpooja/webhook-url`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWebhookUrls(response.data);
    } catch (error) {
      console.error('Failed to fetch webhook URLs:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ ...copied, [key]: true });
      setTimeout(() => {
        setCopied({ ...copied, [key]: false });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const testWebhook = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const response = await axios.post(`${API}/petpooja/payment-webhook`, {
        bill_number: testData.bill_number,
        amount: parseFloat(testData.amount),
        comment: testData.order_number,
        payment_method: testData.payment_method
      });
      setTestResult({ success: true, data: response.data });
    } catch (error) {
      setTestResult({ 
        success: false, 
        data: error.response?.data || { message: error.message }
      });
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#e92587' }} />
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>
            PetPooja Integration Settings
          </h2>
          <p className="text-gray-600 mt-1">
            Configure PetPooja POS webhooks for payment sync
          </p>
        </div>

        {/* Important Notice */}
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Important:</strong> Share these webhook URLs with the PetPooja support team. 
            They need to configure these URLs in your PetPooja account settings.
          </AlertDescription>
        </Alert>

        {/* Webhook URLs */}
        {webhookUrls && (
          <Card>
            <CardHeader>
              <CardTitle>Webhook URLs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Webhook */}
              <div>
                <Label className="text-base font-semibold">Payment Webhook URL</Label>
                <p className="text-sm text-gray-600 mt-1 mb-3">
                  {webhookUrls.payment_webhook_description}
                </p>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrls.payment_webhook_url}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(webhookUrls.payment_webhook_url, 'payment')}
                  >
                    {copied.payment ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Status Callback */}
              <div>
                <Label className="text-base font-semibold">Status Callback URL</Label>
                <p className="text-sm text-gray-600 mt-1 mb-3">
                  {webhookUrls.status_callback_description}
                </p>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrls.status_callback_url}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(webhookUrls.status_callback_url, 'status')}
                  >
                    {copied.status ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expected Fields */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Expected Payment Webhook Fields:</h4>
                <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                  {webhookUrls.payment_expected_fields.map((field, idx) => (
                    <div key={idx}>• {field}</div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Webhook */}
        <Card>
          <CardHeader>
            <CardTitle>Test Payment Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800">
                Test the webhook with sample data to verify it's working. 
                Use an actual order number from your "Pending Orders" or "Manage Orders" page.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bill Number</Label>
                <Input
                  value={testData.bill_number}
                  onChange={(e) => setTestData({ ...testData, bill_number: e.target.value })}
                  placeholder="TEST-001"
                />
              </div>
              <div>
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={testData.amount}
                  onChange={(e) => setTestData({ ...testData, amount: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div>
                <Label>Order Number (from your CRM)</Label>
                <Input
                  value={testData.order_number}
                  onChange={(e) => setTestData({ ...testData, order_number: e.target.value })}
                  placeholder="USB-20260307-006"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Copy an order number from Pending Orders or Manage Orders
                </p>
              </div>
              <div>
                <Label>Payment Method</Label>
                <select
                  value={testData.payment_method}
                  onChange={(e) => setTestData({ ...testData, payment_method: e.target.value })}
                  className="w-full h-10 px-3 border rounded-md"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="online">Online Transfer</option>
                </select>
              </div>
            </div>

            <Button
              onClick={testWebhook}
              disabled={testLoading}
              className="w-full text-white"
              style={{ backgroundColor: '#e92587' }}
            >
              {testLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Test Webhook
                </>
              )}
            </Button>

            {testResult && (
              <Alert className={testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                  <div className="font-semibold mb-2">
                    {testResult.success ? '✅ Success!' : '❌ Failed'}
                  </div>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Setup Instructions for PetPooja Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <span className="font-bold text-lg">1.</span>
                <div>
                  <p className="font-semibold">Share Webhook URLs</p>
                  <p className="text-gray-600">
                    Contact PetPooja support and provide the Payment Webhook URL above. 
                    Request them to configure it in your restaurant's settings.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="font-bold text-lg">2.</span>
                <div>
                  <p className="font-semibold">⚠️ Critical: Add Order ID in Comment Field</p>
                  <p className="text-gray-600">
                    When creating a bill in PetPooja POS for custom cakes, you MUST add 
                    your order number (e.g., USB-20260307-006) in the <strong>Comment/Remarks field</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="font-bold text-lg">3.</span>
                <div>
                  <p className="font-semibold">Test the Integration</p>
                  <p className="text-gray-600">
                    Create a test order in your CRM, then create a bill in PetPooja POS 
                    with the order number in the comment field. Check if it syncs.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="font-bold text-lg">4.</span>
                <div>
                  <p className="font-semibold">Verify Data Flow</p>
                  <p className="text-gray-600">
                    After PetPooja sends data, check the "PetPooja Sync" page to see 
                    if bills are appearing. You can manually sync them to orders.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Common Issues */}
        <Card>
          <CardHeader>
            <CardTitle>⚠️ Common Issues & Solutions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-red-600">Issue: "Order not found" error</p>
                <p className="text-gray-600">
                  <strong>Solution:</strong> Make sure the order number in PetPooja comment field 
                  matches EXACTLY with an order in your CRM (check Pending Orders or Manage Orders page).
                </p>
              </div>

              <div>
                <p className="font-semibold text-red-600">Issue: No bills appearing in PetPooja Sync page</p>
                <p className="text-gray-600">
                  <strong>Solution:</strong> PetPooja hasn't sent any data yet. Confirm with PetPooja 
                  support that the webhook URL is configured correctly.
                </p>
              </div>

              <div>
                <p className="font-semibold text-red-600">Issue: Bills appear but don't sync to orders</p>
                <p className="text-gray-600">
                  <strong>Solution:</strong> The order number in the bill comment doesn't match any order. 
                  Use the "Sync Now" button manually after verifying the order exists.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  );
};

export default PetPoojaSettings;
