const cepController = {
    // ==================================================
    // CONSULTAR CEP (proxy ViaCEP)
    // ==================================================
    async lookup(req, res) {
        try {
            const { cep } = req.params;
            const cleanCep = cep.replace(/\D/g, '');

            if (cleanCep.length !== 8) {
                return res.status(400).json({ error: 'CEP deve ter 8 dígitos' });
            }

            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();

            if (data.erro) {
                return res.status(404).json({ error: 'CEP não encontrado' });
            }

            res.json({
                cep: data.cep,
                street: data.logradouro,
                complement: data.complemento,
                neighborhood: data.bairro,
                city: data.localidade,
                state: data.uf
            });
        } catch (error) {
            console.error('Erro ao consultar CEP:', error);
            res.status(500).json({ error: 'Erro ao consultar CEP' });
        }
    }
};

module.exports = cepController;