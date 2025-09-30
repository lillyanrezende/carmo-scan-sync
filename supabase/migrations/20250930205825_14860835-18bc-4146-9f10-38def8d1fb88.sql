-- Delete all product-related data
-- Order matters: delete child records first, then parent records

DELETE FROM public.product_barcodes;
DELETE FROM public.movimentacao_estoque;
DELETE FROM public.estoques;
DELETE FROM public.produtos;