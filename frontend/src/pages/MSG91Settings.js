import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Save, AlertCircle, CheckCircle, Settings2, Package, Clock, Truck, Star } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EVENT_CONFIG = {
  order_placed: {
    label: 'Order Placed',
    icon: Package,
    color: 'bg-blue-500',
    description: 'Sent when a new order is created',
    defaultVariables: ['body_1', 'body_2', 'body_3', 'body_4']
  },
  order_confirmed: {
    label: 'Order Confirmed',
    icon: CheckCircle,
    color: 'bg-green-500',
    description: 'Sent when order status is Confirmed',
    defaultVariables: ['body_1', 'body_2', 'body_3', 'body_4']
  },
  order_ready: {
    label: 'Order Ready',
    icon: Clock,
    color: 'bg-orange-500',
    description: 'Sent when order is ready for pickup/delivery',
    defaultVariables: ['body_1', 'body_2', 'body_3', 'body_4']
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    icon: Truck,
    color: 'bg-purple-500',
    description: 'Sent when order is picked up',
    defaultVariables: ['body_1', 'body_2', 'body_3', 'body_4']
  },
  delivered: {
    label: 'Delivered',
    icon: Star,
    color: 'bg-pink-500',
    description: 'Sent when order is delivered',
    defaultVariables: ['body_1', 'body_2', 'body_3', 'body_4']
  }
};

const MSG91Settings = () => {
  const { token } = useAuth();
  const [config, setConfig] = useState({ auth_key: '', integrated_number: '' });
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('config');

  useEffect(() => {
    fetchConfig();
    fetchTemplates();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/msg91/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching MSG91 config:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/msg91/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const templatesMap = {};
      response.data.forEach(template => {
        templatesMap[template.event_type] = template;
      });

      setTemplates(templatesMap);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setMessage({ type: 'error', text: 'Failed to load templates' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      await axios.post(
        `${API_URL}/api/msg91/config`,
        config,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: 'MSG91 configuration saved successfully!' });
      fetchConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (eventType) => {
    try {
      setSaving(true);
      const template = templates[eventType] || {
        event_type: eventType,
        template_name: '',
        namespace: '',
        language_code: 'en',
        language_policy: 'deterministic',
        variables: EVENT_CONFIG[eventType].defaultVariables,
        is_enabled: false
      };

      await axios.post(
        `${API_URL}/api/msg91/templates`,
        template,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({ type: 'success', text: `${EVENT_CONFIG[eventType].label} template saved!` });
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage({ type: 'error', text: 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (eventType, field, value) => {
    setTemplates(prev => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        event_type: eventType,
        [field]: value,
        variables: prev[eventType]?.variables || EVENT_CONFIG[eventType].defaultVariables
      }
    }));
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Loading MSG91 settings...</div>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <MessageSquare className="h-8 w-8" style={{ color: '#e92587' }} />
            <h1 className="text-3xl font-bold">MSG91 WhatsApp Settings</h1>
          </div>
          <p className="text-gray-600">
            Configure MSG91 WhatsApp Business API for automated customer notifications
          </p>
        </div>

        {message.text && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="config">
              <Settings2 className="h-4 w-4 mr-2" />
              API Configuration
            </TabsTrigger>
            <TabsTrigger value="templates">
              <MessageSquare className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          {/* API Configuration Tab */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle>MSG91 API Credentials</CardTitle>
                <CardDescription>
                  Configure your MSG91 WhatsApp Business API credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="auth_key">
                    Auth Key <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="auth_key"
                    type="password"
                    value={config.auth_key || ''}
                    onChange={(e) => setConfig({ ...config, auth_key: e.target.value })}
                    placeholder="Enter your MSG91 authkey"
                    className="mt-1 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get your authkey from MSG91 Dashboard → Settings → API Keys
                  </p>
                </div>

                <div>
                  <Label htmlFor="integrated_number">
                    WhatsApp Business Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="integrated_number"
                    value={config.integrated_number || ''}
                    onChange={(e) => setConfig({ ...config, integrated_number: e.target.value })}
                    placeholder="918699391076"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your WhatsApp Business number with country code (without +)
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleSaveConfig}
                    disabled={saving || !config.auth_key || !config.integrated_number}
                    style={{ backgroundColor: '#e92587' }}
                    className="text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-2">📝 How to Get MSG91 Credentials:</p>
                  <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
                    <li>Login to MSG91 Dashboard</li>
                    <li>Go to Settings → API Keys</li>
                    <li>Copy your Auth Key</li>
                    <li>Go to WhatsApp → Settings</li>
                    <li>Copy your Integrated Number</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <div className="space-y-6">
              {Object.entries(EVENT_CONFIG).map(([eventType, config]) => {
                const template = templates[eventType] || {
                  event_type: eventType,
                  template_name: '',
                  namespace: '',
                  language_code: 'en',
                  language_policy: 'deterministic',
                  variables: config.defaultVariables,
                  is_enabled: false
                };

                const Icon = config.icon;

                return (
                  <Card key={eventType}>
                    <CardHeader className="border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${config.color} bg-opacity-10`}>
                            <Icon className="h-5 w-5" style={{ color: '#e92587' }} />
                          </div>
                          <div>
                            <CardTitle className="flex items-center space-x-2">
                              <span>{config.label}</span>
                              {template.is_enabled && (
                                <Badge className="bg-green-500 text-white">Active</Badge>
                              )}
                            </CardTitle>
                            <CardDescription>{config.description}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`enable-${eventType}`} className="text-sm font-medium">
                            Enable
                          </Label>
                          <Switch
                            id={`enable-${eventType}`}
                            checked={template.is_enabled}
                            onCheckedChange={(checked) => updateTemplate(eventType, 'is_enabled', checked)}
                          />
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`template-name-${eventType}`}>
                              Template Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`template-name-${eventType}`}
                              value={template.template_name || ''}
                              onChange={(e) => updateTemplate(eventType, 'template_name', e.target.value)}
                              placeholder="e.g., newyear, order_confirmed"
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              The template name from MSG91 dashboard
                            </p>
                          </div>

                          <div>
                            <Label htmlFor={`namespace-${eventType}`}>
                              Namespace <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id={`namespace-${eventType}`}
                              value={template.namespace || ''}
                              onChange={(e) => updateTemplate(eventType, 'namespace', e.target.value)}
                              placeholder="7d362f25_30fe_479e_8b13_e6aa83e53359"
                              className="mt-1 font-mono text-xs"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Your MSG91 namespace (find in template details)
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-200">
                          <p className="text-xs font-semibold text-green-900 mb-1">Template Variables (Auto-populated):</p>
                          <ul className="text-xs text-green-800 space-y-1">
                            <li><code className="bg-green-100 px-1 py-0.5 rounded">body_1</code> = Customer Name</li>
                            <li><code className="bg-green-100 px-1 py-0.5 rounded">body_2</code> = Order Number</li>
                            <li><code className="bg-green-100 px-1 py-0.5 rounded">body_3</code> = Delivery Date</li>
                            <li><code className="bg-green-100 px-1 py-0.5 rounded">body_4</code> = Delivery Time</li>
                          </ul>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleSaveTemplate(eventType)}
                            disabled={saving || !template.template_name || !template.namespace}
                            style={{ backgroundColor: '#e92587' }}
                            className="text-white"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Template
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>📌 Important Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>All templates must be created and approved in MSG91 dashboard first</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Template names must match exactly with MSG91 (case-sensitive)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Namespace can be found in MSG91 template details</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Phone numbers must include country code without + (e.g., 918699391076)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Templates are disabled by default. Enable them when ready.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Variables (body_1, body_2, etc.) are automatically populated from order data</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </LayoutWithSidebar>
  );
};

export default MSG91Settings;
