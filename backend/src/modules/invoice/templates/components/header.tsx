import { View, Text } from "@react-pdf/renderer"
import { styles } from "../styles"

interface HeaderProps {
  invoiceNumber: string
  issuedDate: string
  orderDisplayId: string
}

export function Header({
  invoiceNumber,
  issuedDate,
  orderDisplayId,
}: HeaderProps) {
  return (
    <View style={styles.headerSection}>
      <Text style={styles.invoiceLabel}>Invoice</Text>
      <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
      <Text style={styles.headerMeta}>
        Issued {issuedDate} · Order {orderDisplayId}
      </Text>
    </View>
  )
}
