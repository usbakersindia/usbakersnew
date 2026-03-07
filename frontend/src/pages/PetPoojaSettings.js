import { useState, useEffect } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, CheckCircle, Info } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PetPoojaSettings = () => {
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState({});

  useEffect(() => {
    fetchWebhookInfo();
  }, []);

  const fetchWebhookInfo = async () => {
    try {
      const response = await axios.get(`${API}/petpooja/webhook-url`);
      setWebhookInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch webhook info:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    setTimeout(() => {
      setCopied({ ...copied, [key]: false });
    }, 2000);
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Loading...</div>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#e92587' }}>PetPooja Integration</h1>
          <p className="text-gray-600 mt-1">Configure automatic payment sync with PetPooja POS</p>
        </div>

        {/* Info Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Note:</strong> Manual payment entry is disabled. All payments are automatically synced from PetPooja POS.
            Configure the webhook URLs below in your PetPooja dashboard.
          </AlertDescription>
        </Alert>

        {/* Webhook URLs */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Webhook */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Payment Webhook URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookInfo?.payment_webhook_url || ''}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm font-mono"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(webhookInfo?.payment_webhook_url, 'payment')}
                >
                  {copied.payment ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {webhookInfo?.payment_webhook_description}
              </p>
            </div>

            {/* Status Callback */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Order Status Callback URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookInfo?.status_callback_url || ''}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm font-mono"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(webhookInfo?.status_callback_url, 'status')}
                >
                  {copied.status ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {webhookInfo?.status_callback_description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 list-decimal list-inside">
              <li className="text-sm">
                <strong>Login to PetPooja Dashboard</strong>
                <p className="text-gray-600 ml-6">Access your PetPooja admin panel</p>
              </li>
              <li className="text-sm">
                <strong>Navigate to Integrations</strong>
                <p className="text-gray-600 ml-6">Go to Settings → Integrations → Webhooks</p>
              </li>
              <li className="text-sm">
                <strong>Add Payment Webhook</strong>
                <p className="text-gray-600 ml-6">
                  Paste the Payment Webhook URL and ensure the Order ID is sent in the 'comment' field
                </p>
              </li>
              <li className="text-sm">
                <strong>Add Status Callback</strong>
                <p className="text-gray-600 ml-6">
                  Paste the Status Callback URL for real-time order status updates
                </p>
              </li>
              <li className="text-sm">
                <strong>Enable Notifications</strong>
                <p className="text-gray-600 ml-6">
                  Enable 'Payment Notifications' and 'Order Status Updates' in PetPooja settings
                </p>
              </li>
              <li className="text-sm">
                <strong>Test the Integration</strong>
                <p className="text-gray-600 ml-6">
                  Process a test order and payment in PetPooja to verify sync
                </p>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Expected Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Expected Webhook Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-2">Payment Webhook Fields:</h3>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                {webhookInfo?.payment_expected_fields?.join(', ')}
              </div>
            </div>
            <div>
              <h3 className="font-medium text-sm mb-2">Status Callback Fields:</h3>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                {webhookInfo?.callback_expected_fields?.join(', ')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  );
};

export default PetPoojaSettings;
