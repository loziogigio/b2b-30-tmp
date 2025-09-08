/* ---------- Types ---------- */
export type Address = {
    street_address: string;
    city: string;
    state?: string;
    zip?: string;
    country: string;
  };
  
  export type OrderItem = {
    id: string;
    name: string;
    unit?: string;          // e.g. "0.2lb"
    price: number;          // unit price
    quantity: number;
    image?: string;         // thumbnail URL (optional)
    reviewUrl?: string;     // optional CTA link
  };
  
  export type OrderStatusKey =
    | 'pending'
    | 'processing'
    | 'at-local-facility'
    | 'out-for-delivery'
    | 'completed';
  
  export type Order = {
    id: string;
    tracking_number: string;
    sub_total: number;
    discount: number;
    delivery_fee: number;
    tax: number;
    total: number;
    created_at: string; // ISO date
    shipping_address: Address;
    billing_address: Address;
  
    // NEW
    order_status: OrderStatusKey;
    items: OrderItem[];
  };
  
  /* ---------- Static Data ---------- */
  export const MOCK_ORDERS: Order[] = [
    {
      id: '37',
      tracking_number: '20231103386117',
      sub_total: 11.0,
      discount: 0,
      delivery_fee: 50,
      tax: 0.22,
      total: 61.22,
      created_at: '2023-11-03T09:00:00.000Z',
      shipping_address: {
        street_address: '2148 Straford Park',
        city: 'Winchester',
        state: 'KY',
        zip: '40391',
        country: 'United States',
      },
      billing_address: {
        street_address: '2231 Kidd Avenue',
        city: 'Kipnuk',
        state: 'AK',
        zip: '99614',
        country: 'United States',
      },
      order_status: 'processing',
      items: [
        {
          id: '203',
          name: 'Dairy Milk Reclose',
          unit: '0.2lb',
          price: 3.5,
          quantity: 1,
          image:
            'https://pickbazarlaravel.s3.ap-southeast-1.amazonaws.com/205/conversions/cadbury-dairy-milk-reclose-thumbnail.jpg',
        },
        {
          id: '204',
          name: 'Cloetta Chocowoffle Crispy',
          unit: '0.2lb',
          price: 2.5,
          quantity: 1,
          image:
            'https://pickbazarlaravel.s3.ap-southeast-1.amazonaws.com/206/conversions/cloetta-thumbnail.jpg',
        },
        {
          id: '205',
          name: 'Cloetta Sprinkle',
          unit: '0.2lb',
          price: 3.0,
          quantity: 1,
          image:
            'https://pickbazarlaravel.s3.ap-southeast-1.amazonaws.com/207/conversions/cloetta_sprinkle-thumbnail.jpg',
        },
        {
          id: '208',
          name: 'Nestle Butterfinger',
          unit: '0.1lb',
          price: 1.0,
          quantity: 1,
          image:
            'https://pickbazarlaravel.s3.ap-southeast-1.amazonaws.com/210/conversions/nestle_butterfinger-thumbnail.jpg',
        },
        {
          id: '207',
          name: 'M & M Funsize',
          unit: '0.1lb',
          price: 1.0,
          quantity: 1,
          image:
            'https://pickbazarlaravel.s3.ap-southeast-1.amazonaws.com/209/conversions/m%26m_funsize-thumbnail.jpg',
        },
      ],
    },
    {
      id: '39',
      tracking_number: '20231103515221',
      sub_total: 6.0,
      discount: 0,
      delivery_fee: 50,
      tax: 0.12,
      total: 56.12,
      created_at: '2023-11-03T15:30:00.000Z',
      shipping_address: {
        street_address: '121 5th Ave',
        city: 'New York',
        state: 'NY',
        zip: '10003',
        country: 'United States',
      },
      billing_address: {
        street_address: '121 5th Ave',
        city: 'New York',
        state: 'NY',
        zip: '10003',
        country: 'United States',
      },
      order_status: 'completed',
      items: [
        {
          id: '206',
          name: 'Hersheys Kisses',
          unit: '0.2lb',
          price: 3.5,
          quantity: 1,
          image:
            'https://pickbazarlaravel.s3.ap-southeast-1.amazonaws.com/208/conversions/hersheys_kisses-thumbnail.jpg',
        },
        {
          id: '204',
          name: 'Cloetta Chocowoffle Crispy',
          unit: '0.2lb',
          price: 2.5,
          quantity: 1,
          image:
            'https://pickbazarlaravel.s3.ap-southeast-1.amazonaws.com/206/conversions/cloetta-thumbnail.jpg',
        },
      ],
    },
  ];
  