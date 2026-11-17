import type { DataRow, ShopDetail } from '../../lib/types'

export function DataTable({
  rows,
  caption,
}: {
  rows: DataRow[]
  caption: string
}) {
  if (!rows.length)
    return <p className="shop-empty">{caption}: không có dòng dữ liệu.</p>
  const columns = Object.keys(rows[0])
  return (
    <div className="shop-table-scroll">
      <table className="shop-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id ?? index)}>
              {columns.map((column) => (
                <td key={column}>
                  {row[column] === null ? 'NULL' : String(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function QueryEvidence({ detail }: { detail: ShopDetail }) {
  return (
    <section className="query-evidence" aria-label="Bằng chứng truy vấn">
      <h2>SQL & kết quả</h2>
      <pre className="sql">
        <code>{detail.inspector.sql_preview_redacted}</code>
      </pre>
      <p className="subtle">{detail.inspector.preview_label}</p>
      {detail.inspector.parameters.length > 0 && (
        <>
          <h3>Tham số gửi riêng</h3>
          <pre className="sql">
            <code>{JSON.stringify(detail.inspector.parameters, null, 2)}</code>
          </pre>
        </>
      )}
      <p>
        {detail.sqlstate
          ? `PostgreSQL trả lỗi SQLSTATE ${detail.sqlstate}.`
          : `PostgreSQL trả về ${detail.rows.length} dòng.`}
        {detail.duration_ms !== null &&
          ` Thời gian truy vấn: ${detail.duration_ms} ms.`}
      </p>
      <DataTable rows={detail.rows} caption="Dữ liệu trả về từ truy vấn" />
    </section>
  )
}
