import { useState, useEffect } from 'react';
import axios from 'axios';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NewOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [outlets, setOutlets] = useState([]);
  const [zones, setZones] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);

  const [formData, setFormData] = useState({
    order_type: 'self',
    receiver_info: null,
    customer_info: {
      name: '',
      phone: '',
      alternate_phone: '',
      birthday: '',
      gender: null
    },
    needs_delivery: false,
    delivery_address: '',
    delivery_city: '',
    zone_id: '',
    custom_delivery_charge: 0,
    occasion: '',
    flavour: '',
    size_pounds: 1,
    cake_image_url: '',
    secondary_images: [],
    name_on_cake: '',
    special_instructions: '',
    delivery_date: '',
    delivery_time: '',
    outlet_id: user?.outlet_id || '', // Auto-fetch from logged-in user
    order_taken_by: '',
    total_amount: 0
  });

  useEffect(() => {
    // Auto-set outlet_id when user loads
    if (user?.outlet_id && !formData.outlet_id) {
      setFormData(prev => ({ ...prev, outlet_id: user.outlet_id }));
    }
  }, [user]);

  useEffect(() => {
    fetchOutlets();
    if (user?.outlet_id) {
      fetchSalesPersons(user.outlet_id);
    }
  }, [user]);

  useEffect(() => {
    if (formData.outlet_id) {
      fetchZones(formData.outlet_id);
      fetchSalesPersons(formData.outlet_id);
    }
  }, [formData.outlet_id]);

  // Auto-calculate total when zone or cake amount changes
  useEffect(() => {
    if (formData.needs_delivery && selectedZone) {
      const cakeAmount = parseFloat(formData.total_amount) || 0;
      const deliveryCharge = parseFloat(selectedZone.delivery_charge) || 0;
      // Don't add delivery to total_amount here - backend will do it
    }
  }, [formData.zone_id, formData.total_amount, formData.needs_delivery, selectedZone]);

  const fetchOutlets = async () => {
    try {
      const response = await axios.get(`${API}/outlets`);
      setOutlets(response.data);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    }
  };

  const fetchZones = async (outletId) => {
    try {
      const response = await axios.get(`${API}/zones?outlet_id=${outletId}`);
      setZones(response.data);
    } catch (error) {
      console.error('Failed to fetch zones:', error);
    }
  };

  const fetchSalesPersons = async (outletId) => {
    try {
      const url = outletId 
        ? `${API}/sales-persons?outlet_id=${outletId}`
        : `${API}/sales-persons`;
      const response = await axios.get(url);
      setSalesPersons(response.data);
    } catch (error) {
      console.error('Failed to fetch sales persons:', error);
    }
  };

  const handleImageUpload = async (e, type = 'primary') => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await axios.post(`${API}/upload-image`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (type === 'primary') {
        setFormData({ ...formData, cake_image_url: response.data.url });
      } else {
        setFormData({
          ...formData,
          secondary_images: [...formData.secondary_images, response.data.url]
        });
      }
    } catch (error) {
      setError('Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeSecondaryImage = (index) => {
    const newImages = formData.secondary_images.filter((_, i) => i !== index);
    setFormData({ ...formData, secondary_images: newImages });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate
    if (!formData.cake_image_url) {
      setError('Cake image is mandatory');
      setLoading(false);
      return;
    }

    if (formData.needs_delivery && !formData.delivery_address) {
      setError('Delivery address is required for delivery orders');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API}/orders`, formData);
      const createdOrder = response.data;
      
      setSuccess(`Order created! ID: ${createdOrder.order_number} - Status: PENDING (awaiting payment sync from PetPooja)`);
      
      // Show order ID prominently
      alert(`✅ Order Created Successfully!\n\nOrder ID: ${createdOrder.order_number}\n\nStatus: PENDING\n\nIMPORTANT: Add this Order ID in PetPooja "Comment" field to sync payment automatically.`);
      
      setTimeout(() => navigate('/hold-orders'), 2000);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: '#e92587' }}>New Order</h2>
          <p className="text-gray-600 mt-1">Create a new cake order</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Type */}
          <Card>
            <CardHeader>
              <CardTitle>Order Type</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.order_type}
                onValueChange={(value) => setFormData({ ...formData, order_type: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="self" id="self" />
                  <Label htmlFor="self">For Self</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="someone_else" id="someone_else" />
                  <Label htmlFor="someone_else">For Someone Else</Label>
                </div>
              </RadioGroup>

              {formData.order_type === 'someone_else' && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold">Receiver Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Receiver Name *</Label>
                      <Input
                        required
                        value={formData.receiver_info?.name || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            receiver_info: { ...formData.receiver_info, name: e.target.value }
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Receiver Phone *</Label>
                      <Input
                        required
                        value={formData.receiver_info?.phone || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            receiver_info: { ...formData.receiver_info, phone: e.target.value }
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Alternate Phone</Label>
                      <Input
                        value={formData.receiver_info?.alternate_phone || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            receiver_info: {
                              ...formData.receiver_info,
                              alternate_phone: e.target.value
                            }
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Receiver Address *</Label>
                      <Input
                        required
                        value={formData.receiver_info?.address || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            receiver_info: { ...formData.receiver_info, address: e.target.value }
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    required
                    value={formData.customer_info.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customer_info: { ...formData.customer_info, name: e.target.value }
                      })
                    }
                    data-testid="customer-name-input"
                  />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input
                    required
                    value={formData.customer_info.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customer_info: { ...formData.customer_info, phone: e.target.value }
                      })
                    }
                    data-testid="customer-phone-input"
                  />
                </div>
                <div>
                  <Label>Alternate Phone</Label>
                  <Input
                    value={formData.customer_info.alternate_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customer_info: { ...formData.customer_info, alternate_phone: e.target.value }
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Birthday</Label>
                  <Input
                    type="date"
                    value={formData.customer_info.birthday}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customer_info: { ...formData.customer_info, birthday: e.target.value }
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select
                    value={formData.customer_info.gender || ''}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        customer_info: { ...formData.customer_info, gender: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.needs_delivery}
                  onCheckedChange={(checked) => setFormData({ ...formData, needs_delivery: checked })}
                  data-testid="delivery-toggle"
                />
                <Label>Delivery Required</Label>
              </div>

              {formData.needs_delivery && (
                <div className="space-y-4">
                  <div>
                    <Label>Delivery Address *</Label>
                    <Textarea
                      required
                      value={formData.delivery_address}
                      onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                      data-testid="delivery-address-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>City *</Label>
                      <Input
                        required
                        value={formData.delivery_city}
                        onChange={(e) => setFormData({ ...formData, delivery_city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Zone</Label>
                      <Select
                        value={formData.zone_id}
                        onValueChange={(value) => setFormData({ ...formData, zone_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select zone" />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                              {zone.name} - ₹{zone.delivery_charge}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">Custom Delivery Charge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {formData.zone_id === 'custom' && (
                    <div>
                      <Label>Custom Delivery Charge (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Enter custom delivery charge"
                        onChange={(e) => setFormData({ ...formData, custom_delivery_charge: parseFloat(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-gray-500 mt-1">For areas not covered by zones</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cake Details */}
          <Card>
            <CardHeader>
              <CardTitle>Cake Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Outlet *</Label>
                  <Select
                    required
                    value={formData.outlet_id}
                    onValueChange={(value) => setFormData({ ...formData, outlet_id: value })}
                  >
                    <SelectTrigger data-testid="outlet-select">
                      <SelectValue placeholder="Select outlet" />
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((outlet) => (
                        <SelectItem key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Order Taken By *</Label>
                  <Select
                    required
                    value={formData.order_taken_by}
                    onValueChange={(value) => setFormData({ ...formData, order_taken_by: value })}
                  >
                    <SelectTrigger data-testid="order-taken-by-select">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.incentive_percentage}% incentive)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Occasion</Label>
                  <Select
                    value={formData.occasion}
                    onValueChange={(value) => setFormData({ ...formData, occasion: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select occasion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Birthday">Birthday</SelectItem>
                      <SelectItem value="Anniversary">Anniversary</SelectItem>
                      <SelectItem value="Wedding">Wedding</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Flavour *</Label>
                  <Input
                    required
                    value={formData.flavour}
                    onChange={(e) => setFormData({ ...formData, flavour: e.target.value })}
                    placeholder="e.g., Chocolate, Vanilla"
                    data-testid="flavour-input"
                  />
                </div>
                <div>
                  <Label>Size (Pounds) *</Label>
                  <Input
                    required
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.size_pounds}
                    onChange={(e) => setFormData({ ...formData, size_pounds: parseFloat(e.target.value) })}
                    data-testid="size-input"
                  />
                </div>
                <div>
                  <Label>Name on Cake</Label>
                  <Input
                    value={formData.name_on_cake}
                    onChange={(e) => setFormData({ ...formData, name_on_cake: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Total Amount (₹) *</Label>
                  <Input
                    required
                    type="number"
                    min="0"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) })}
                    data-testid="amount-input"
                  />
                </div>
              </div>

              <div>
                <Label>Special Instructions</Label>
                <Textarea
                  value={formData.special_instructions}
                  onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                  placeholder="Add any special instructions here..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Delivery Date *</Label>
                  <Input
                    required
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                    data-testid="delivery-date-input"
                  />
                </div>
                <div>
                  <Label>Delivery Time *</Label>
                  <Input
                    required
                    type="time"
                    value={formData.delivery_time}
                    onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                    data-testid="delivery-time-input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Cake Images *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Primary Cake Image (Mandatory)</Label>
                <div className="mt-2">
                  {formData.cake_image_url ? (
                    <div className="relative inline-block">
                      <img
                        src={`${BACKEND_URL}${formData.cake_image_url}`}
                        alt="Cake"
                        className="w-32 h-32 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, cake_image_url: '' })}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-xs text-gray-500 mt-2">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'primary')}
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <Label>Additional Images (Optional)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.secondary_images.map((img, index) => (
                    <div key={index} className="relative inline-block">
                      <img
                        src={`${BACKEND_URL}${img}`}
                        alt={`Secondary ${index + 1}`}
                        className="w-24 h-24 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeSecondaryImage(index)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50">
                    <Plus className="h-6 w-6 text-gray-400" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'secondary')}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>

              {uploadingImage && <p className="text-sm text-gray-500">Uploading image...</p>}
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || uploadingImage}
              className="text-white"
              style={{ backgroundColor: '#e92587' }}
              data-testid="submit-order-button"
            >
              {loading ? 'Creating Order...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </div>
    </LayoutWithSidebar>
  );
};

export default NewOrder;
