import pool from './db'

export interface Sale {
  id: string
  vendor_id: string
  product_name: string
  quantity: number
  price: number
  sale_date: string
  created_at: string
}

export async function createSale(
  vendorId: string,
  productName: string,
  quantity: number,
  price: number,
  saleDate: string
): Promise<Sale> {
  const result = await pool.query(
    // Keep storage as-is, but normalize read paths; insert keeps provided date string
    'INSERT INTO sales (vendor_id, product_name, quantity, price, sale_date) VALUES ($1, $2, $3, $4, $5) RETURNING id, vendor_id, product_name, quantity, price, to_char(((sale_date AT TIME ZONE \'Asia/Kolkata\')::date), \'YYYY-MM-DD\') as sale_date, created_at',
    [vendorId, productName, quantity, price, saleDate]
  )
  return result.rows[0]
}

export async function getSalesByVendor(vendorId: string): Promise<Sale[]> {
  const result = await pool.query(
    `SELECT id, vendor_id, product_name, quantity, price,
            to_char(((sale_date AT TIME ZONE 'Asia/Kolkata')::date), 'YYYY-MM-DD') as sale_date,
            created_at
     FROM sales
     WHERE vendor_id = $1
     ORDER BY ((sale_date AT TIME ZONE 'Asia/Kolkata')::date) DESC`,
    [vendorId]
  )
  return result.rows
}

export async function getSalesByProduct(vendorId: string, productName: string): Promise<Sale[]> {
  const result = await pool.query(
    `SELECT id, vendor_id, product_name, quantity, price,
            to_char(((sale_date AT TIME ZONE 'Asia/Kolkata')::date), 'YYYY-MM-DD') as sale_date,
            created_at
     FROM sales
     WHERE vendor_id = $1 AND LOWER(product_name) LIKE LOWER($2)
     ORDER BY ((sale_date AT TIME ZONE 'Asia/Kolkata')::date) DESC`,
    [vendorId, `%${productName}%`]
  )
  return result.rows
}

export async function getSalesByDateRange(vendorId: string, startDate: string, endDate: string): Promise<Sale[]> {
  const result = await pool.query(
    `SELECT id, vendor_id, product_name, quantity, price,
            to_char(((sale_date AT TIME ZONE 'Asia/Kolkata')::date), 'YYYY-MM-DD') as sale_date,
            created_at
     FROM sales
     WHERE vendor_id = $1
       AND ((sale_date AT TIME ZONE 'Asia/Kolkata')::date) BETWEEN $2::date AND $3::date
     ORDER BY ((sale_date AT TIME ZONE 'Asia/Kolkata')::date) DESC`,
    [vendorId, startDate, endDate]
  )
  return result.rows
}

export async function getSalesByYear(vendorId: string, year: number): Promise<Sale[]> {
  const result = await pool.query(
    `SELECT id, vendor_id, product_name, quantity, price,
            to_char(((sale_date AT TIME ZONE 'Asia/Kolkata')::date), 'YYYY-MM-DD') as sale_date,
            created_at
     FROM sales
     WHERE vendor_id = $1 AND EXTRACT(YEAR FROM (sale_date AT TIME ZONE 'Asia/Kolkata')) = $2
     ORDER BY ((sale_date AT TIME ZONE 'Asia/Kolkata')::date) DESC`,
    [vendorId, year]
  )
  return result.rows
}

export async function getSalesByMonth(vendorId: string, year: number, month: number): Promise<Sale[]> {
  const result = await pool.query(
    `SELECT id, vendor_id, product_name, quantity, price,
            to_char(((sale_date AT TIME ZONE 'Asia/Kolkata')::date), 'YYYY-MM-DD') as sale_date,
            created_at
     FROM sales
     WHERE vendor_id = $1
       AND EXTRACT(YEAR FROM (sale_date AT TIME ZONE 'Asia/Kolkata')) = $2
       AND EXTRACT(MONTH FROM (sale_date AT TIME ZONE 'Asia/Kolkata')) = $3
     ORDER BY ((sale_date AT TIME ZONE 'Asia/Kolkata')::date) DESC`,
    [vendorId, year, month]
  )
  return result.rows
}

export async function getTotalSales(vendorId: string): Promise<{ total_quantity: number; total_revenue: number }> {
  const result = await pool.query(
    'SELECT SUM(quantity) as total_quantity, SUM(quantity * price) as total_revenue FROM sales WHERE vendor_id = $1',
    [vendorId]
  )
  return {
    total_quantity: parseInt(result.rows[0].total_quantity) || 0,
    total_revenue: parseFloat(result.rows[0].total_revenue) || 0
  }
}

export async function getProductSummary(vendorId: string): Promise<Array<{ product_name: string; total_quantity: number; total_revenue: number }>> {
  const result = await pool.query(
    'SELECT product_name, SUM(quantity) as total_quantity, SUM(quantity * price) as total_revenue FROM sales WHERE vendor_id = $1 GROUP BY product_name ORDER BY total_revenue DESC',
    [vendorId]
  )
  return result.rows.map(row => ({
    product_name: row.product_name,
    total_quantity: parseInt(row.total_quantity),
    total_revenue: parseFloat(row.total_revenue)
  }))
}
