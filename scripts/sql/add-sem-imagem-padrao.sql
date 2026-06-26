-- Executar uma vez no MySQL (painel Hostinger ou cliente SQL)
ALTER TABLE produtos_site
  ADD COLUMN sem_imagem_padrao TINYINT NOT NULL DEFAULT 0
  AFTER ordem;
