import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MaterialItem } from "@/lib/admin-api";
import {
  baseOrcamento,
  calcDescontoOrcamento,
  formatDescontoPctOrc,
  formatDescontoValorOrc,
  garantirTotalOrcamentoConsistente,
  inventarioSubtotalOrcamento,
  parseMoneyBr,
  sanitizarNumeroBr,
  type OrcamentoLinha,
  type OrcamentoModoDesconto,
} from "@/lib/orcamento.server";

type CampoDesconto = "percent" | "valor" | "total";

export function useOrcamentoForm(materiais: MaterialItem[]) {
  const [partData, setPartData] = useState<OrcamentoLinha[]>([]);
  const [descontoPct, setDescontoPct] = useState("");
  const [descontoValor, setDescontoValor] = useState("");
  const [valorMostrar, setValorMostrar] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [observacao, setObservacao] = useState("");
  const [pesquisa, setPesquisa] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [metros, setMetros] = useState("1");

  const descontoSourceRef = useRef<OrcamentoModoDesconto>("percent");
  const valorBaseManualRef = useRef(0);
  const syncingRef = useRef(false);
  const carregandoRef = useRef(false);
  const campoFocadoRef = useRef<CampoDesconto | null>(null);

  const subtotal = useMemo(() => inventarioSubtotalOrcamento(partData), [partData]);

  const getDesc = useCallback(() => {
    return calcDescontoOrcamento(
      subtotal,
      valorBaseManualRef.current,
      descontoSourceRef.current,
      descontoPct,
      descontoValor,
      valorMostrar,
    );
  }, [subtotal, descontoPct, descontoValor, valorMostrar]);

  const sincronizarDescontoPar = useCallback(() => {
    const base = baseOrcamento(
      subtotal,
      valorBaseManualRef.current,
      valorMostrar,
      descontoSourceRef.current,
    );
    if (base <= 0 && descontoSourceRef.current !== "total") return;

    const desc = getDesc();
    const src = descontoSourceRef.current;
    const foco = campoFocadoRef.current;
    syncingRef.current = true;

    if (src !== "total") {
      if (src !== "valor" && foco !== "valor") {
        setDescontoValor(formatDescontoValorOrc(desc.descontoValor));
      }
      if (src !== "percent" && foco !== "percent") {
        setDescontoPct(formatDescontoPctOrc(desc.descontoPct));
      }
      if (foco !== "total") {
        setValorMostrar(formatDescontoValorOrc(desc.total));
      }
    }

    syncingRef.current = false;
  }, [subtotal, valorMostrar, getDesc]);

  useEffect(() => {
    if (carregandoRef.current) return;
    if (partData.length === 0) return;
    valorBaseManualRef.current = 0;
    if (descontoSourceRef.current === "total") {
      descontoSourceRef.current = "percent";
    }
    sincronizarDescontoPar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partData]);

  const onValorTotalInput = useCallback(
    (raw: string) => {
      if (syncingRef.current) return;
      const v = sanitizarNumeroBr(raw);
      setValorMostrar(v);
      descontoSourceRef.current = "total";
      valorBaseManualRef.current = parseMoneyBr(v);
      setDescontoPct("");
      setDescontoValor("");
    },
    [],
  );

  const onValorTotalBlur = useCallback(() => {
    campoFocadoRef.current = null;
    if (syncingRef.current) return;
    let n = parseMoneyBr(valorMostrar);
    if (subtotal > 0 && n > subtotal) n = subtotal;
    setValorMostrar(n > 0 ? formatDescontoValorOrc(n) : "");
    descontoSourceRef.current = "total";
    valorBaseManualRef.current = n;
    sincronizarDescontoPar();
  }, [valorMostrar, subtotal, sincronizarDescontoPar]);

  const onValorTotalFocus = useCallback(() => {
    campoFocadoRef.current = "total";
  }, []);

  const onDescontoPctInput = useCallback(
    (raw: string) => {
      if (syncingRef.current) return;
      setDescontoPct(sanitizarNumeroBr(raw));
      descontoSourceRef.current = "percent";
      valorBaseManualRef.current = 0;
      sincronizarDescontoPar();
    },
    [sincronizarDescontoPar],
  );

  const onDescontoPctBlur = useCallback(() => {
    campoFocadoRef.current = null;
    if (syncingRef.current) return;
    valorBaseManualRef.current = 0;
    descontoSourceRef.current = "percent";
    const desc = getDesc();
    setDescontoPct(desc.descontoPct > 0 ? formatDescontoPctOrc(desc.descontoPct) : "");
    sincronizarDescontoPar();
  }, [getDesc, sincronizarDescontoPar]);

  const onDescontoPctFocus = useCallback(() => {
    campoFocadoRef.current = "percent";
  }, []);

  const onDescontoValorInput = useCallback(
    (raw: string) => {
      if (syncingRef.current) return;
      setDescontoValor(sanitizarNumeroBr(raw));
      descontoSourceRef.current = "valor";
      valorBaseManualRef.current = 0;
      sincronizarDescontoPar();
    },
    [sincronizarDescontoPar],
  );

  const onDescontoValorBlur = useCallback(() => {
    campoFocadoRef.current = null;
    if (syncingRef.current) return;
    valorBaseManualRef.current = 0;
    descontoSourceRef.current = "valor";
    const desc = getDesc();
    setDescontoValor(desc.descontoValor > 0 ? formatDescontoValorOrc(desc.descontoValor) : "");
    sincronizarDescontoPar();
  }, [getDesc, sincronizarDescontoPar]);

  const onDescontoValorFocus = useCallback(() => {
    campoFocadoRef.current = "valor";
  }, []);

  const materiaisFiltrados = useMemo(() => {
    const q = pesquisa.trim().toLowerCase();
    if (!q) return materiais;
    return materiais.filter((m) => m.material.toLowerCase().includes(q));
  }, [materiais, pesquisa]);

  const addMaterial = useCallback(() => {
    const m = materiais.find((x) => String(x.id) === materialId);
    if (!m) return;
    const mt = Number.parseFloat(metros.replace(",", ".")) || 1;
    setPartData((prev) => [
      ...prev,
      {
        material: m.material,
        metros: mt,
        valor: m.valor,
        valor_custo: m.valor_custo,
        id: m.id,
      },
    ]);
    setMaterialId("");
    setMetros("1");
  }, [materiais, materialId, metros]);

  const removeLinha = useCallback((idx: number) => {
    setPartData((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const resetForm = useCallback(() => {
    setPartData([]);
    setDescontoPct("");
    setDescontoValor("");
    setValorMostrar("");
    setFormaPagamento("");
    setCpfCnpj("");
    setObservacao("");
    setPesquisa("");
    setMaterialId("");
    setMetros("1");
    descontoSourceRef.current = "percent";
    valorBaseManualRef.current = 0;
    carregandoRef.current = false;
    campoFocadoRef.current = null;
  }, []);

  const loadExisting = useCallback(
    (data: {
      partData: OrcamentoLinha[];
      valor: number;
      descontoPercent: number;
      observacao: string;
      cpfCnpj: string;
    }) => {
      carregandoRef.current = true;
      setPartData(data.partData);
      setCpfCnpj(data.cpfCnpj.replace(/\D/g, "") === "00000000000" ? "" : data.cpfCnpj);
      setObservacao(data.observacao);
      const sub = inventarioSubtotalOrcamento(data.partData);
      const resolved = garantirTotalOrcamentoConsistente(
        sub,
        "percent",
        data.descontoPercent,
        0,
        data.valor,
      );
      setDescontoPct(
        resolved.percent > 0 ? formatDescontoPctOrc(resolved.percent) : "",
      );
      setDescontoValor(
        resolved.valor > 0 ? formatDescontoValorOrc(resolved.valor) : "",
      );
      setValorMostrar(formatDescontoValorOrc(resolved.total));
      setFormaPagamento("");
      descontoSourceRef.current = "percent";
      valorBaseManualRef.current = 0;
      queueMicrotask(() => {
        carregandoRef.current = false;
      });
    },
    [],
  );

  const buildPayload = useCallback(() => {
    const desc = getDesc();
    const modo = descontoSourceRef.current;
    const resolved = garantirTotalOrcamentoConsistente(
      subtotal,
      modo,
      desc.descontoPct,
      desc.descontoValor,
      desc.total,
    );
    return {
      partData,
      formaPagamento,
      descontoModo: modo,
      descontoPercent: resolved.percent,
      descontoValor: resolved.valor,
      valor: resolved.total,
      cpfCnpj,
      observacao,
    };
  }, [partData, formaPagamento, getDesc, subtotal, cpfCnpj, observacao]);

  const onMetrosInput = useCallback((raw: string) => {
    let v = raw.replace(/[^\d,.]/g, "");
    const sep = v.includes(",") ? "," : v.includes(".") ? "." : null;
    if (sep) {
      const parts = v.split(sep);
      v = parts[0] + sep + (parts[1] ?? "").slice(0, 2);
    }
    setMetros(v);
  }, []);

  return {
    partData,
    descontoPct,
    descontoValor,
    valorMostrar,
    formaPagamento,
    setFormaPagamento,
    cpfCnpj,
    setCpfCnpj,
    observacao,
    setObservacao,
    pesquisa,
    setPesquisa,
    materialId,
    setMaterialId,
    metros,
    onMetrosInput,
    materiaisFiltrados,
    addMaterial,
    removeLinha,
    resetForm,
    loadExisting,
    buildPayload,
    onValorTotalInput,
    onValorTotalBlur,
    onValorTotalFocus,
    onDescontoPctInput,
    onDescontoPctBlur,
    onDescontoPctFocus,
    onDescontoValorInput,
    onDescontoValorBlur,
    onDescontoValorFocus,
    subtotal,
  };
}
