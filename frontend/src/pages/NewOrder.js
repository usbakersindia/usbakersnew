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
import { Upload, Plus, X, Mic, Square, Play, Trash2 } from 'lucide-react';
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
  const [flavours, setFlavours] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);

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
    size_pounds: '',
    cake_image_url: '',
    secondary_images: [],
    name_on_cake: '',
    special_instructions: '',
    voice_instruction_url: '',
    delivery_date: '',
    delivery_time: '',
    outlet_id: user?.outlet_id || '', // Auto-fetch from logged-in user
    order_taken_by: '',
    total_amount: 0,
    is_credit_order: false
  });

  useEffect(() => {
    // Auto-set outlet_id when user loads
    if (user?.outlet_id && !formData.outlet_id) {
      setFormData(prev => ({ ...prev, outlet_id: user.outlet_id }));
    }
  }, [user]);

  useEffect(() => {
    fetchOutlets();
    fetchFlavours();
    fetchOccasions();
    fetchTimeSlots();
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

  const fetchFlavours = async () => {
    try {
      const response = await axios.get(`${API}/flavours`);
      setFlavours(response.data);
    } catch (error) {
      console.error('Failed to fetch flavours:', error);
    }
  };

  const fetchOccasions = async () => {
    try {
      const response = await axios.get(`${API}/occasions`);
      setOccasions(response.data);
    } catch (error) {
      console.error('Failed to fetch occasions:', error);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await axios.get(`${API}/time-slots`);
      setTimeSlots(response.data);
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
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

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      setError('Microphone access denied. Please allow microphone access.');
      console.error('Recording error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioURL(null);
    setFormData({ ...formData, voice_instruction_url: '' });
  };

  const uploadVoiceRecording = async () => {
    if (!audioBlob) return;

    const voiceFormData = new FormData();
    voiceFormData.append('file', audioBlob, 'voice-instruction.webm');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/upload-voice`, voiceFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setFormData({ ...formData, voice_instruction_url: response.data.file_url });
      setSuccess('Voice instruction uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to upload voice instruction');
      console.error('Upload error:', error);
    }
  };

  const handleSubmit = async (e, isPunchOrder = false) => {
    e.preventDefault();
    
    // Validate for punch orders
    if (isPunchOrder) {
      const errors = [];
      if (!formData.customer_info.name) errors.push('Customer name');
      if (!formData.customer_info.phone) errors.push('Customer phone');
      if (!formData.order_taken_by) errors.push('Order taken by');
      if (!formData.occasion) errors.push('Occasion');
      if (!formData.flavour) errors.push('Flavour');
      if (!formData.delivery_date) errors.push('Delivery date');
      if (!formData.delivery_time) errors.push('Delivery time');
      if (!formData.total_amount || formData.total_amount <= 0) errors.push('Cake amount');
      if (formData.needs_delivery && !formData.delivery_address) errors.push('Delivery address');
      if (formData.needs_delivery && !formData.zone_id) errors.push('Delivery zone');
      
      if (errors.length > 0) {
        setError(`Missing required fields: ${errors.join(', ')}`);
        setLoading(false);
        return;
      }
    }
    
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
      const response = await axios.post(`${API}/orders?is_punch_order=${isPunchOrder}`, formData);
      const createdOrder = response.data;
      
      if (isPunchOrder) {
        setSuccess(`✅ Punch Order Created! Order #: ${createdOrder.order_number}`);
        alert(`✅ Punch Order Created!\n\nOrder #: ${createdOrder.order_number}\n\nStatus: Pending (waiting for 20% payment)\n\nIMPORTANT: Add Order # in PetPooja comment field.`);
        setTimeout(() => navigate('/pending-orders'), 2000);
      } else {
        setSuccess(`✅ Hold Order Created! Order #: ${createdOrder.order_number}`);
        setTimeout(() => navigate('/hold-orders'), 2000);
      }
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
                      <SelectValue placeholder="Select sales person" />
                    </SelectTrigger>
                    <SelectContent>
                      {salesPersons.length === 0 ? (
                        <SelectItem value="none" disabled>No sales persons available</SelectItem>
                      ) : (
                        salesPersons.map(person => (
                          <SelectItem key={person.id} value={person.id}>
                            {person.name}
                          </SelectItem>
                        ))
                      )}
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
                      {occasions.map((occasion) => (
                        <SelectItem key={occasion.id} value={occasion.name}>
                          {occasion.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Flavour *</Label>
                  <Select
                    required
                    value={formData.flavour}
                    onValueChange={(value) => setFormData({ ...formData, flavour: value })}
                  >
                    <SelectTrigger data-testid="flavour-select">
                      <SelectValue placeholder="Select flavour" />
                    </SelectTrigger>
                    <SelectContent>
                      {flavours.map((flavour) => (
                        <SelectItem key={flavour.id} value={flavour.name}>
                          {flavour.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Size (Pounds) *</Label>
                  <Input
                    required
                    type="number"
                    step="0.5"
                    min="0.5"
                    placeholder="Enter cake size in pounds"
                    value={formData.size_pounds || ''}
                    onChange={(e) => setFormData({ ...formData, size_pounds: e.target.value ? parseFloat(e.target.value) : '' })}
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
                <Label>Special Instructions (one per line)</Label>
                <Textarea
                  value={formData.special_instructions}
                  onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                  placeholder={"Enter each instruction on a new line, e.g.:\nExtra cream on top\nNo fondant\nWrite name in red color"}
                  rows={4}
                />
              </div>

              {/* Voice Instructions */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">🎤 Voice Instructions</Label>
                      {audioURL && !isRecording && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={deleteRecording}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                    
                    {!audioURL && !isRecording && (
                      <Button
                        type="button"
                        onClick={startRecording}
                        className="w-full text-white"
                        style={{ backgroundColor: '#e92587' }}
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        Start Recording
                      </Button>
                    )}

                    {isRecording && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center space-x-2 text-red-600 animate-pulse">
                          <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                          <span className="font-semibold">Recording...</span>
                        </div>
                        <Button
                          type="button"
                          onClick={stopRecording}
                          className="w-full"
                          variant="destructive"
                        >
                          <Square className="mr-2 h-4 w-4" />
                          Stop Recording
                        </Button>
                      </div>
                    )}

                    {audioURL && !isRecording && (
                      <div className="space-y-3">
                        <audio controls src={audioURL} className="w-full" />
                        <Button
                          type="button"
                          onClick={uploadVoiceRecording}
                          className="w-full text-white"
                          style={{ backgroundColor: '#10b981' }}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Voice Instruction
                        </Button>
                      </div>
                    )}
                    
                    {formData.voice_instruction_url && (
                      <Alert className="bg-green-50 border-green-200">
                        <AlertDescription className="text-green-800">
                          ✓ Voice instruction attached to order
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>


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
                    type="time"
                    required
                    value={formData.delivery_time}
                    onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                    data-testid="delivery-time-input"
                    className="w-full"
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
                        src={formData.cake_image_url.startsWith('http') ? formData.cake_image_url : `${BACKEND_URL}${formData.cake_image_url.startsWith('/uploads/') ? '/api' + formData.cake_image_url : formData.cake_image_url}`}
                        alt="Cake"
                        className="w-32 h-32 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, cake_image_url: '' })}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg z-10 cursor-pointer transition-all"
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
                        src={img.startsWith('http') ? img : `${BACKEND_URL}${img.startsWith('/uploads/') ? '/api' + img : img}`}
                        alt={`Secondary ${index + 1}`}
                        className="w-24 h-24 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeSecondaryImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-lg z-10 cursor-pointer transition-all"
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
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, false)}
              disabled={loading || uploadingImage}
              data-testid="hold-order-button"
            >
              {loading ? 'Creating...' : 'Hold Order'}
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading || uploadingImage}
              className="text-white"
              style={{ backgroundColor: '#e92587' }}
              data-testid="punch-order-button"
            >
              {loading ? 'Creating...' : 'Punch Order'}
            </Button>
          </div>
          {selectedZone && formData.total_amount > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Order Summary:</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Cake Amount:</span>
                  <span className="font-semibold">₹{formData.total_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span className="font-semibold">₹{selectedZone.delivery_charge}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="font-bold">Total Amount:</span>
                  <span className="font-bold text-lg">₹{parseFloat(formData.total_amount) + parseFloat(selectedZone.delivery_charge)}</span>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </LayoutWithSidebar>
  );
};

export default NewOrder;
