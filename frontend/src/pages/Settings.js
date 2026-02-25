import { useEffect, useState } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings as SettingsIcon, Copy, CheckCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const [webhookData, setWebhookData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWebhookUrl();
  }, []);

  const fetchWebhookUrl = async () => {
    try {
      const response = await axios.get(`${API}/petpooja/webhook-url`);
      setWebhookData(response.data);
    } catch (error) {
      console.error('Failed to fetch webhook URL:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>Settings</h2>
          <p className="text-gray-600 mt-1">System configuration and preferences</p>
        </div>

        {/* Settings Cards */}
        <div className="grid grid-cols-1 gap-6">
          {/* PetPooja Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2 h-5 w-5" style={{ color: '#e92587' }} />
                PetPooja POS Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Configure PetPooja POS integration to receive order status updates automatically.
              </p>

              {webhookData && (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      <strong>Webhook URL for PetPooja Team:</strong>
                      <div className="mt-2 p-3 bg-gray-50 rounded border flex items-center justify-between">
                        <code className="text-sm break-all">{webhookData.webhook_url}</code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(webhookData.webhook_url)}
                          className="ml-2"
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="border rounded p-4 space-y-2">
                    <h4 className="font-semibold">Integration Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                      <li>Copy the webhook URL above</li>
                      <li>Provide this URL to your PetPooja account manager or technical team</li>
                      <li>PetPooja will configure this as your callback URL in their system</li>
                      <li>
                        When orders are processed in PetPooja POS, status updates will automatically
                        sync to US Bakers system
                      </li>
                    </ol>

                    <div className="mt-4 p-3 bg-blue-50 rounded">
                      <p className="text-sm font-semibold text-blue-900">What syncs automatically:</p>
                      <ul className="text-sm text-blue-800 mt-1 space-y-1">
                        <li>• Order status updates (Accepted, Ready, Dispatched, Delivered)</li>
                        <li>• Cancellation notifications with reasons</li>
                        <li>• Kitchen preparation time estimates</li>
                        <li>• Delivery partner assignments</li>
                      </ul>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 rounded">
                      <p className="text-sm font-semibold text-yellow-900">Required Information for PetPooja:</p>
                      <ul className="text-sm text-yellow-800 mt-1 space-y-1">
                        <li>• <strong>Method:</strong> POST</li>
                        <li>• <strong>Content-Type:</strong> application/json</li>
                        <li>• <strong>Authentication:</strong> None required (public webhook)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* WhatsApp Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2 h-5 w-5" style={{ color: '#e92587' }} />
                WhatsApp Business API Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Configure WhatsApp Business API settings for automated notifications</p>
              <p className="text-sm text-gray-400 mt-2">Coming in Phase 9</p>
            </CardContent>
          </Card>

          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2 h-5 w-5" style={{ color: '#e92587' }} />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Configure general system settings and preferences</p>
              <p className="text-sm text-gray-400 mt-2">Coming soon</p>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="mr-2 h-5 w-5" style={{ color: '#e92587' }} />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Configure notification and alert preferences</p>
              <p className="text-sm text-gray-400 mt-2">Coming soon</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutWithSidebar>
  );
};

export default Settings;
