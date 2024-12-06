export interface ProductRes {
  name: string;
  partNumber: string;
  shortDescription: null | unknown;
  trimmedSpecifications: null | unknown;
  productSepecifications: null | unknown;
  recommendedCategory: [string, number];
  items: Item[];
  onSale: boolean;
  clearance: boolean;
  whatsNew: boolean;
  ftoos: boolean;
  epp: boolean;
}

interface Item {
  name: string;
  etilizeId: string;
  partNumber: string;
  detailImage: string;
  enlargeImage: string;
  shortDescription: string;
  longDescription: string;
  productSpecifications: string;
  packagedQuantity: string;
  imageURL: string;
  imageSpecs: string;
  productPartNumber: string;
  trimmedProductSpecification: string;
  manufacturerPartNumber: string;
  definingAttributeName: null | unknown;
  definingAttributeValue: null | unknown;
  itemPrice: string;
  etilizeData: boolean;
  outOfStock: boolean;
  hasPriceRange: boolean;
  uom: string;
  customCode: string;
  inventory: number;
  showPoweredByGFK: boolean;
  showCartButton: boolean;
  showQuoteButton: boolean;
  priceRanges: [] | unknown;
  mediaDtos: MediaDto[];
  regularPriceExist: boolean;
  outOfStockMessage?: null | unknown;
  onClearance: boolean;
  supplementaryCharges?: null | unknown;
  xrefno: string;
  displayAttributes: string;
  meta: Meta;
  regularPrice: null | string | unknown;
  yourPrice: null | string | unknown;
  showSupplementaryCharges: boolean;
}

interface Meta {
  keywords: string;
  description: string;
}

interface MediaDto {
  type: string;
  path: string;
  spec: string;
  ext1: null | unknown;
  ext2: null | unknown;
  displayName?: string;
}
